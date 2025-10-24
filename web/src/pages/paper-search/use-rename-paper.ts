import { useSetModalState } from '@/hooks/common-hooks';
import { Paper } from '@/interfaces/paper-search';
import { useCallback, useState } from 'react';

export const useRenamePaper = () => {
  const [paper, setPaper] = useState<Paper>({} as Paper);
  const {
    visible: paperRenameVisible,
    hideModal: hidePaperRenameModal,
    showModal: showPaperRenameModal,
  } = useSetModalState();

  const onPaperRenameOk = useCallback(
    async (name: string) => {
      // Implement rename functionality if needed
      console.log('Rename paper:', { ...paper, title: name });
      hidePaperRenameModal();
    },
    [paper, hidePaperRenameModal],
  );

  const handleShowPaperRenameModal = useCallback(
    (record: Paper) => {
      setPaper(record);
      showPaperRenameModal();
    },
    [showPaperRenameModal],
  );

  return {
    paperRenameLoading: false,
    initialPaperName: paper?.title,
    onPaperRenameOk,
    paperRenameVisible,
    hidePaperRenameModal,
    showPaperRenameModal: handleShowPaperRenameModal,
  };
};
