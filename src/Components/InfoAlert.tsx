import { BsFillInfoSquareFill } from 'react-icons/bs';
/**
 * Reusable InfoAlert component
 * @param {string} message - The message to display inside the alert.
 */

function InfoAlert({ message, title }: { message: string; title: string }) {
  return (
    <div
      className="bg-blue-100 border-t-4 border-blue-500 rounded-b text-blue-900 px-4 py-3 shadow-md"
      role="alert"
    >
      <div className="flex">
        <div className="py-1 mr-4">
          <BsFillInfoSquareFill />
        </div>
        <div>
          <p className="font-bold">{title}</p>
          <p className="text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
}

export default InfoAlert;
