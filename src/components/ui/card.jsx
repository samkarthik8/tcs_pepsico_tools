export function Card({ className = "", children, onClick, icon }) {
    return (
        <div
            onClick={onClick}
            className={`bg-red-700 rounded-2xl shadow-lg p-8 cursor-pointer hover:bg-blue-800 transition transform hover:scale-105 ${className}`}
        >
            {/* Optional Icon */}
            {icon && (
                <div className="text-4xl mb-4 flex justify-center text-white">
                    {icon}
                </div>
            )}
            {children}
        </div>
    );
}
