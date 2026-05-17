import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RegisterForm from './Register'
import Index from './index'
import LoginForm from './Login'
import MyAccount from './MyAccount'
import Planets from"./Star"

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/register" element={<RegisterForm />} />
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<LoginForm />} />
                <Route path="/myaccount" element={<MyAccount />} />
                <Route path="/star" element={<Planets />} />
            </Routes>
        </BrowserRouter>
    </StrictMode>
)