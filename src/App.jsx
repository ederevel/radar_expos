import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import RadarExpos from "./RadarExpos";

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <div>
      <RadarExpos />
    </div>
    </>
  )
}

export default App
