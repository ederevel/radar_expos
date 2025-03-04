from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import cv2
import dlib
import pytesseract
import time
from pdf2image import convert_from_path
import pandas as pd
from unidecode import unidecode
import math

app = FastAPI()

# Configuration de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://35.180.192.17:3000", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the static folder
app.mount("/static", StaticFiles(directory="static"), name="static")

UPLOAD_FOLDER = "uploads"
PROCESSED_FOLDER = "static/processed_faces"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

detector = dlib.get_frontal_face_detector()
#pytesseract.pytesseract.tesseract_cmd = r'/opt/homebrew/bin/tesseract'  # Update path if necessary
pytesseract.pytesseract.tesseract_cmd = r'/usr/bin/tesseract'  # Update path if necessary

first_name_df = pd.read_csv("static/first_name_db_fr_insee.csv")

def extract_first_name(text):
    words = text.split(" ")
    for word in words:
        gender_test = find_first_name_gender(unidecode(word.lower()))
        if gender_test:
            return word, gender_test
    return None, None

def find_first_name_gender(text):
    first_name_query = first_name_df[first_name_df["first_name"] == text]
    if first_name_query.shape[0] > 0:
        return first_name_query["sexe"].values[0]
    else:
        return None

def process_text_box(text_box):
    box, text = text_box
    first_name, gender = extract_first_name(text)
    return box, text, first_name, gender

def process_image(image_path):
    start_time = time.time()
    image = cv2.imread(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = detector(gray)
    face_detection_time = time.time()

    custom_config = r'--oem 3 --psm 11'
    text_results = pytesseract.image_to_data(gray, output_type=pytesseract.Output.DICT, config=custom_config, lang='fra')

    #text_results = pytesseract.image_to_data(gray, output_type=pytesseract.Output.DICT)
    ocr_time = time.time()
    text_results_df = pd.DataFrame(text_results)
    print(text_results_df["text"].to_list())
    text_results_df["text"] = text_results_df["text"].str.strip()
    text_results_df = text_results_df[(text_results_df["conf"] > 0)&(text_results_df["text"].str.len() > 1)]
    text_results_df["first_name"] = text_results_df["text"].str.split(" ").str[0].str.lower()
    text_results_df["first_name"] = text_results_df["first_name"].apply(unidecode)
    text_results_df = pd.merge(text_results_df, first_name_df, on="first_name", how="left")
    text_results_df = text_results_df.dropna(subset=["sexe"])
    text_results_df = text_results_df[['text', 'sexe', 'left', 'top', 'width', 'height']]
    print(text_results_df)
    
    #text_boxes = [(None, text_results['text'][i]) for i in range(len(text_results['text'])) if text_results['text'][i].strip()]
    #first_name_text_boxes = [process_text_box(tb) for tb in text_boxes if process_text_box(tb)[2]]
    text_processing_time = time.time()
    
    people_data = []
    for i, face in enumerate(faces):
        x, y, w, h = face.left(), face.top(), face.width(), face.height()
        face_img = image[max(y-30, 0):y+h+30, max(x-30, 0):x+w+30]
        face_path = os.path.join(PROCESSED_FOLDER, f"{int(time.time())}_face_{i+1}.jpg")
        cv2.imwrite(face_path, face_img)

        gender, first_name, min_distance = None, None, float('inf')
        for index, row in text_results_df.iterrows():
            if row["top"] > y + h:
                text_box_top_center = (row["left"] + row["width"]/2, row["top"])
                face_center = (x + w / 2, y + h / 2)
                distance = math.dist(text_box_top_center, face_center)
                if distance < min_distance:
                    min_distance = distance
                    first_name = row["text"]
                    gender = row["sexe"]

        if first_name:
            people_data.append({"name": first_name, "image": f"/static/processed_faces/{os.path.basename(face_path)}", "gender": gender})
    
    end_time = time.time()
    print(f"Timing - Face Detection: {face_detection_time - start_time:.4f}s, OCR: {ocr_time - face_detection_time:.4f}s, Text Processing: {text_processing_time - ocr_time:.4f}s, Total: {end_time - start_time:.4f}s")
    
    return people_data

def process_pdf(pdf_path, output_dir="pdf_extracted_images"):
    os.makedirs(output_dir, exist_ok=True)
    start_time = time.time()
    images = convert_from_path(pdf_path)
    pdf_conversion_time = time.time()
    
    people_data = []
    for i, image in enumerate(images):
        image_path = os.path.join(output_dir, f"page_{i+1}.jpg")
        image.save(image_path, "JPEG")
        people_data += process_image(image_path)
    
    end_time = time.time()
    print(f"PDF Processing Timing - Conversion: {pdf_conversion_time - start_time:.4f}s, Total: {end_time - start_time:.4f}s")
    
    return people_data

@app.post("/api/upload/")
async def upload_file(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    with open(file_path, "wb") as f:
        f.write(await file.read())
    
    start_time = time.time()
    extracted_people = process_pdf(file_path) if file_path.endswith(".pdf") else process_image(file_path)
    end_time = time.time()
    print(f"Upload Processing Timing - Total: {end_time - start_time:.4f}s")
    
    return {"people": extracted_people}

@app.get("/")
async def root():
    return {"message": "API FastAPI en ligne"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)