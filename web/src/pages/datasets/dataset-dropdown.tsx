import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeleteKnowledge } from '@/hooks/use-knowledge-request';
import { useFetchUserInfo } from '@/hooks/user-setting-hooks';
import { IKnowledge } from '@/interfaces/database/knowledge';
import { PenLine, Trash2 } from 'lucide-react';
import { MouseEventHandler, PropsWithChildren, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRenameDataset } from './use-rename-dataset';

export function DatasetDropdown({
  children,
  showDatasetRenameModal,
  dataset,
}: PropsWithChildren &
  Pick<ReturnType<typeof useRenameDataset>, 'showDatasetRenameModal'> & {
    dataset: IKnowledge;
  }) {
  const { t } = useTranslation();
  const { deleteKnowledge } = useDeleteKnowledge();
  const { data: userInfo } = useFetchUserInfo();

  // 检查用户是否有编辑权限
  const hasEditPermission = dataset.tenant_id === userInfo?.id || (userInfo?.is_superuser && dataset.permission === 'public');

  const handleShowDatasetRenameModal: MouseEventHandler<HTMLDivElement> =
    useCallback(
      (e) => {
        e.stopPropagation();
        if (hasEditPermission) {
          showDatasetRenameModal(dataset);
        }
      },
      [dataset, showDatasetRenameModal, hasEditPermission],
    );

  const handleDelete: MouseEventHandler<HTMLDivElement> = useCallback(() => {
    if (hasEditPermission) {
      deleteKnowledge(dataset.id);
    }
  }, [dataset.id, deleteKnowledge, hasEditPermission]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent>
        {hasEditPermission && (
          <DropdownMenuItem onClick={handleShowDatasetRenameModal}>
            {t('common.rename')} <PenLine />
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
              {t('common.delete')} <Trash2 />
            </DropdownMenuItem>
          </ConfirmDeleteDialog>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
