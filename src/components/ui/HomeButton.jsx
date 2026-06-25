import React from "react";
import {useNavigate} from "react-router-dom";
import {FiHome} from "react-icons/fi";

export default function HomeButton() {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate("/")}
            className="
absolute top-8 right-8
flex items-center gap-3
bg-gradient-to-r from-blue-700 to-blue-500
hover:from-blue-600 hover:to-blue-400
text-white
font-bold text-lg
px-7 py-3.5
rounded-xl
shadow-xl
transition-all
duration-200
hover:scale-105
active:scale-95
z-50
"
        >
            <FiHome size={20}/>
            Home
        </button>
    );
}