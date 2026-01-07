import { useState } from 'react';
import { GrUserSettings } from 'react-icons/gr';
import StockfishOptionsComponent from './StockfishOptions';
import { Modal } from './Modal';
import ViewerSetting from './ViewerSetting';

export function Setting() {
  const [showSetting, setShowSetting] = useState(false);
  const toggleSetting = () => {
    setShowSetting(!showSetting);
  };
  return (
    <div>
      <button
        onClick={toggleSetting}
        className="p-2 rounded-lg hover:bg-primary-100 transition-colors cursor-pointer"
        title="Settings"
        aria-label="Settings"
      >
        <GrUserSettings className="text-xl sm:text-2xl text-primary-700" />
      </button>

      {showSetting && (
        <Modal onClose={() => setShowSetting(false)}>
          <div className="p-3">
            <StockfishOptionsComponent />

            <ViewerSetting />
          </div>
        </Modal>
      )}
    </div>
  );
}
