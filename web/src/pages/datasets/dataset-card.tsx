import { MoreButton } from '@/components/more-button';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useNavigatePage } from '@/hooks/logic-hooks/navigate-hooks';
import { IKnowledge } from '@/interfaces/database/knowledge';
import { t } from 'i18next';
import { ChevronRight, Database, FileText, HardDrive } from 'lucide-react';
import { DatasetDropdown } from './dataset-dropdown';
import { useRenameDataset } from './use-rename-dataset';

export type DatasetCardProps = {
  dataset: IKnowledge;
} & Pick<ReturnType<typeof useRenameDataset>, 'showDatasetRenameModal'>;

export function DatasetCard({
  dataset,
  showDatasetRenameModal,
}: DatasetCardProps) {
  const { navigateToDataset } = useNavigatePage();

  return (
    <Card className="group flex flex-col h-full hover:shadow-xl transition-shadow duration-300 overflow-hidden border-border-secondary">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Database className="text-white w-5 h-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg font-semibold truncate max-w-[160px]">
                {dataset.name}
              </CardTitle>
              <div className="flex items-center gap-1 mt-1">
                {dataset.nickname && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {dataset.nickname}
                  </span>
                )}
              </div>
            </div>
          </div>
          <DatasetDropdown
            showDatasetRenameModal={showDatasetRenameModal}
            dataset={dataset}
          >
            <MoreButton className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </DatasetDropdown>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3 flex-1">
        <div className="space-y-3">
          <div className="flex items-center text-sm text-text-tertiary gap-2">
            <FileText className="w-4 h-4" />
            <span>
              {dataset.doc_num || 0} {t('knowledgeDetails.files')}
            </span>
          </div>

          <div className="flex items-center text-sm text-text-tertiary gap-2">
            <HardDrive className="w-4 h-4" />
            <span>
              {dataset.chunk_num || 0} {t('chunks')}
            </span>
          </div>

          <div className="pt-2">
            <p className="text-sm text-text-secondary line-clamp-2">
              {dataset.description || t('dataset.noDescription')}
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-4 py-3 bg-bg-secondary/30 border-t border-border-secondary flex justify-between items-center">
        <div className="text-xs text-text-tertiary">
          {t('updated')} {new Date(dataset.update_time).toLocaleDateString()}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 p-0 text-primary hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            navigateToDataset(dataset.id);
          }}
        >
          {t('viewDetails')} <ChevronRight className="w-3 h-3 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export function SeeAllCard() {
  const { navigateToDatasetList } = useNavigatePage();

  return (
    <Card
      className="w-40 flex-none h-full border-2 border-dashed border-border-tertiary hover:border-primary/50 transition-colors flex items-center justify-center cursor-pointer"
      onClick={navigateToDatasetList}
    >
      <CardContent className="p-4 w-full h-full flex flex-col items-center justify-center gap-1.5 text-text-secondary">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center mb-2">
          <ChevronRight className="text-white w-5 h-5" />
        </div>
        <span className="font-medium">{t('seeAll')}</span>
      </CardContent>
    </Card>
  );
}
