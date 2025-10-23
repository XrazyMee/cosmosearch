import { DataFlowSelect } from '@/components/data-pipeline-select';
import GraphRagItems from '@/components/parse-configuration/graph-rag-form-fields';
import RaptorFormFields from '@/components/parse-configuration/raptor-form-fields';
import { Button } from '@/components/ui/button';
import Divider from '@/components/ui/divider';
import { Form } from '@/components/ui/form';
import { FormLayout } from '@/constants/form';
import { DocumentParserType } from '@/constants/knowledge';
import { PermissionRole } from '@/constants/permission';
import { useFetchKnowledgeBaseConfiguration } from '@/hooks/use-knowledge-request';
import { useFetchUserInfo } from '@/hooks/user-setting-hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { TopTitle } from '../dataset-title';
import {
  GenerateType,
  IGenerateLogButtonProps,
} from '../dataset/generate-button/generate';
import { ChunkMethodForm } from './chunk-method-form';
import ChunkMethodLearnMore from './chunk-method-learn-more';
import { MainContainer } from './configuration-form-container';
import { ChunkMethodItem, ParseTypeItem } from './configuration/common-item';
import { formSchema } from './form-schema';
import { GeneralForm } from './general-form';
import { SavingButton } from './saving-button';
const enum DocumentType {
  DeepDOC = 'DeepDOC',
  PlainText = 'Plain Text',
}

const initialEntityTypes = [
  'organization',
  'person',
  'geo',
  'event',
  'category',
];

const enum MethodValue {
  General = 'general',
  Light = 'light',
}

export default function DatasetSettings() {
  const { t } = useTranslation();
  const { data: userInfo } = useFetchUserInfo();
  const [hasEditPermission, setHasEditPermission] = useState(false);

  // 使用独立的hook获取知识库详情
  const { data: detailsData, isLoading } = useFetchKnowledgeBaseConfiguration();

  useEffect(() => {
    if (detailsData) {
      // 检查用户是否有编辑权限
      const permission = detailsData.tenant_id === userInfo?.id ||
                        (userInfo?.is_superuser && detailsData.permission === 'public');
      setHasEditPermission(permission);
    }
  }, [detailsData, userInfo]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: detailsData?.name || '',
      parser_id: detailsData?.parser_id || DocumentParserType.Naive,
      permission: detailsData?.permission as any || PermissionRole.Me,
      parser_config: detailsData?.parser_config || {
        layout_recognize: DocumentType.DeepDOC,
        chunk_token_num: 512,
        delimiter: `\n`,
        auto_keywords: 0,
        auto_questions: 0,
        html4excel: false,
        topn_tags: 3,
        toc_extraction: false,
        raptor: {
          use_raptor: true,
          max_token: 256,
          threshold: 0.1,
          max_cluster: 64,
          random_seed: 0,
          prompt: t('knowledgeConfiguration.promptText'),
        },
        graphrag: {
          use_graphrag: true,
          entity_types: initialEntityTypes,
          method: MethodValue.Light,
        },
      },
      pipeline_id: detailsData?.pipeline_id || '',
      parseType: detailsData?.pipeline_id ? 2 : 1,
      pagerank: detailsData?.pagerank || 0,
    },
    disabled: !hasEditPermission, // 如果没有编辑权限，则禁用整个表单
  });
  // const [pipelineData, setPipelineData] = useState<IDataPipelineNodeProps>();
  const [graphRagGenerateData, setGraphRagGenerateData] =
    useState<IGenerateLogButtonProps>();
  const [raptorGenerateData, setRaptorGenerateData] =
    useState<IGenerateLogButtonProps>();

  useEffect(() => {
    console.log('🚀 ~ DatasetSettings ~ detailsData:', detailsData);
    if (detailsData) {
      // const data: IDataPipelineNodeProps = {
      //   id: detailsData.pipeline_id,
      //   name: detailsData.pipeline_name,
      //   avatar: detailsData.pipeline_avatar,
      //   linked: true,
      // };
      // setPipelineData(data);
      setGraphRagGenerateData({
        finish_at: detailsData.graphrag_task_finish_at,
        task_id: detailsData.graphrag_task_id,
      } as IGenerateLogButtonProps);
      setRaptorGenerateData({
        finish_at: detailsData.raptor_task_finish_at,
        task_id: detailsData.raptor_task_id,
      } as IGenerateLogButtonProps);
      form.setValue('parseType', detailsData.pipeline_id ? 2 : 1);
      form.setValue('pipeline_id', detailsData.pipeline_id || '');
    }
  }, [detailsData, form]);

  async function onSubmit(data: z.infer<typeof formSchema>) {
    try {
      console.log('Form validation passed, submit data', data);
    } catch (error) {
      console.error('An error occurred during submission:', error);
    }
  }
  // const handleLinkOrEditSubmit = (
  //   data: IDataPipelineSelectNode | undefined,
  // ) => {
  //   console.log('🚀 ~ DatasetSettings ~ data:', data);
  //   if (data) {
  //     setPipelineData(data);
  //     form.setValue('pipeline_id', data.id || '');
  //     // form.setValue('pipeline_name', data.name || '');
  //     // form.setValue('pipeline_avatar', data.avatar || '');
  //   }
  // };

  const handleDeletePipelineTask = (type: GenerateType) => {
    if (type === GenerateType.KnowledgeGraph) {
      setGraphRagGenerateData({
        finish_at: '',
        task_id: '',
      } as IGenerateLogButtonProps);
    } else if (type === GenerateType.Raptor) {
      setRaptorGenerateData({
        finish_at: '',
        task_id: '',
      } as IGenerateLogButtonProps);
    }
  };

  const parseType = useWatch({
    control: form.control,
    name: 'parseType',
    defaultValue: detailsData?.pipeline_id ? 2 : 1,
  });
  const selectedTag = useWatch({
    name: 'parser_id',
    control: form.control,
  });
  useEffect(() => {
    if (parseType === 1) {
      form.setValue('pipeline_id', '');
    }
    console.log('parseType', parseType);
  }, [parseType, form]);
  return (
    <section className="p-5 h-full flex flex-col">
      <TopTitle
        title={t('knowledgeDetails.configuration')}
        description={t('knowledgeConfiguration.titleDescription')}
      ></TopTitle>
      <div className="flex gap-14 flex-1 min-h-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 ">
            <div className="w-[768px] h-[calc(100vh-240px)] pr-1 overflow-y-auto scrollbar-auto">
              <MainContainer className="text-text-secondary">
                <GeneralForm></GeneralForm>
                <Divider />

                <GraphRagItems
                  className="border-none p-0"
                  data={graphRagGenerateData as IGenerateLogButtonProps}
                  onDelete={() =>
                    handleDeletePipelineTask(GenerateType.KnowledgeGraph)
                  }
                ></GraphRagItems>
                <Divider />
                <RaptorFormFields
                  data={raptorGenerateData as IGenerateLogButtonProps}
                  onDelete={() => handleDeletePipelineTask(GenerateType.Raptor)}
                ></RaptorFormFields>
                <Divider />
                <ParseTypeItem line={1} />
                {parseType === 1 && (
                  <ChunkMethodItem line={1}></ChunkMethodItem>
                )}
                {parseType === 2 && (
                  <DataFlowSelect
                    isMult={false}
                    showToDataPipeline={true}
                    formFieldName="pipeline_id"
                    layout={FormLayout.Horizontal}
                  />
                )}

                <Divider />
                {parseType === 1 && <ChunkMethodForm />}

                {/* <LinkDataPipeline
                  data={pipelineData}
                  handleLinkOrEditSubmit={handleLinkOrEditSubmit}
                /> */}
              </MainContainer>
            </div>
            <div className="text-right items-center flex justify-end gap-3 w-[768px]">
              <Button
                type="reset"
                className="bg-transparent text-color-white hover:bg-transparent border-gray-500 border-[1px]"
                disabled={!hasEditPermission}
                onClick={() => {
                  if (hasEditPermission) {
                    form.reset();
                  }
                }}
              >
                {t('knowledgeConfiguration.cancel')}
              </Button>
              <SavingButton disabled={!hasEditPermission}></SavingButton>
            </div>
          </form>
        </Form>
        <div className="flex-1">
          {parseType === 1 && <ChunkMethodLearnMore parserId={selectedTag} />}
        </div>
      </div>
    </section>
  );
}
