export function Card({ className = "", children, onClick }) {
    return (
        <div
            onClick={onClick}
            className={`bg-gray-800 rounded-2xl shadow-lg ${className}`}
        >
            {children}
        </div>
    );
}
