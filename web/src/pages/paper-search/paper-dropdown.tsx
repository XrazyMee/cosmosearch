import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFetchUserInfo } from '@/hooks/user-setting-hooks';
import { Paper } from '@/interfaces/paper-search';
import { PenLine, Trash2 } from 'lucide-react';
import { MouseEventHandler, PropsWithChildren, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRenamePaper } from './use-rename-paper';

export function PaperDropdown({
  children,
  showPaperRenameModal,
  paper,
}: PropsWithChildren &
  Pick<ReturnType<typeof useRenamePaper>, 'showPaperRenameModal'> & {
    paper: Paper;
  }) {
  const { t } = useTranslation();
  const { data: userInfo } = useFetchUserInfo();

  // Papers don't have edit permissions like datasets, so we'll add basic functionality
  const hasEditPermission = true; // For papers, we can assume the user can interact with them

  const handleShowPaperRenameModal: MouseEventHandler<HTMLDivElement> =
    useCallback(
      (e) => {
        e.stopPropagation();
        if (hasEditPermission) {
          showPaperRenameModal(paper);
        }
      },
      [paper, showPaperRenameModal, hasEditPermission],
    );

  const handleDelete: MouseEventHandler<HTMLDivElement> = useCallback(() => {
    // Implement paper deletion if needed in future
    console.log('Delete paper:', paper);
  }, [paper]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent>
        {hasEditPermission && (
          <DropdownMenuItem onClick={handleShowPaperRenameModal}>
            {t('paperSearch.viewDetails') || t('common.edit') || 'View Details'}{' '}
            <PenLine />
          </DropdownMenuItem>
        )}
        {hasEditPermission && <DropdownMenuSeparator />}
        {hasEditPermission && (
          <ConfirmDeleteDialog onOk={handleDelete}>
            <DropdownMenuItem
              className="text-state-error"
              onSelect={(e) => {
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {t('paperSearch.remove') || t('common.remove') || 'Remove'}{' '}
              <Trash2 />
            </DropdownMenuItem>
          </ConfirmDeleteDialog>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
