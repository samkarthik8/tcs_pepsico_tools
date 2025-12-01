export function Card({ className = "", children }) {
    return (
        <div
            className={`bg-gray-800 p-4 rounded-xl shadow-md ${className}`}
        >
            {children}
        </div>
    );
}
