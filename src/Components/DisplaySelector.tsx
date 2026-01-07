import { CgDisplayGrid, CgList, CgMenuCheese } from 'react-icons/cg';

interface IDisplaySelectorProps {
  mode: 'list' | 'card' | 'table';
  onChange: (type: 'list' | 'card' | 'table') => void;
}

export function DisplaySelector({ onChange, mode }: IDisplaySelectorProps) {
  return (
    <>
      <CgDisplayGrid
        onClick={() => onChange('card')}
        color={mode === 'card' ? '#105463' : ''}
        className="cursor-pointer text-xl mr-2"
      />
      <CgList
        onClick={() => onChange('list')}
        className="cursor-pointer text-xl  mr-2 "
        color={mode === 'list' ? '#105463' : ''}
      />

      <CgMenuCheese
        onClick={() => onChange('table')}
        className="cursor-pointer text-lg"
        color={mode === 'table' ? '#105463' : ''}
      />
    </>
  );
}
