import { useEffect, useState } from 'react';
import { BiCloudUpload } from 'react-icons/bi';
import { TbWorldUpload } from 'react-icons/tb';
import { Modal } from './Modal';
import InfoAlert from './InfoAlert';

function PgnUploadComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [fileContent, setFileContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFileChange = (e: any) => {
    const file = e.target.files[0];
    setSelectedFile(file);
  };

  useEffect(() => {
    if (!selectedFile) {
      return;
    }
    const reader = new FileReader();

    reader.onload = async (event: any) => {
      const fileContent = event.target.result;
      setFileContent(fileContent);
    };

    reader.readAsText(selectedFile);
  }, [selectedFile]);

  const handleUpload = async () => {
    try {
      // Replace with your backend API endpoint
      const response = await fetch(import.meta.env.VITE_UPLOAD_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pgn: fileContent }),
      });

      const data = await response.json();
      console.log(data); // Handle the response data as required
      setIsSuccess(true);
      // setIsOpen(false);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };
  return (
    <div>
      <button
        className="bg-green-500 rounded-sm p-1"
        onClick={() => setIsOpen(true)}
      >
        <BiCloudUpload className="inline mr-4" />
        Upload game
      </button>
      {isOpen && (
        <Modal
          onClose={() => {
            setIsOpen(false);
          }}
        >
          <div className="container mx-auto p-4">
            <InfoAlert
              title="Alternative"
              message="You can upload single/multiple games by email them to : hbcc.it+games@outlook.com"
            />
            <h2 className="text-2xl mb-4 mt-4">Upload your game (*.pgn):</h2>

            <div className="mb-4">
              <input
                type="file"
                title="Select pgn file"
                onChange={handleFileChange}
                className="border p-2"
              />
            </div>

            {fileContent && (
              <div className="mt-4">
                <h2 className="text-lg mb-2">PGN:</h2>
                <pre className="bg-gray-200 p-4 whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                  {fileContent}
                </pre>
              </div>
            )}
            {isSuccess && (
              <div className="bg-green-100 border border-green-400 text-white-700 px-4 py-2 rounded relative mt-5">
                Thanks you for contribue your game. This game will be processed
                quickly and available on the the website.
              </div>
            )}
            <button
              disabled={!fileContent}
              onClick={handleUpload}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-5 text-center"
            >
              <TbWorldUpload className="inline mr-2" />
              Upload
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default PgnUploadComponent;
