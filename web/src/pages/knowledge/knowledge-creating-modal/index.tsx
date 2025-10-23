import { IModalManagerChildrenProps } from '@/components/modal-manager';
import { Form, Input, Modal, Select } from 'antd';
import { useTranslation } from 'react-i18next';

type FieldType = {
  name?: string;
  permission?: string;
};

interface IProps extends Omit<IModalManagerChildrenProps, 'showModal'> {
  loading: boolean;
  onOk: (data: { name: string; permission?: string }) => void;
}

const KnowledgeCreatingModal = ({
  visible,
  hideModal,
  loading,
  onOk,
}: IProps) => {
  const [form] = Form.useForm();

  const { t } = useTranslation('translation', { keyPrefix: 'knowledgeList' });

  const handleOk = async () => {
    const ret = await form.validateFields();
    onOk({ name: ret.name, permission: ret.permission || 'me' });
  };

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      await handleOk();
    }
  };

  return (
    <Modal
      title={t('createKnowledgeBase')}
      open={visible}
      onOk={handleOk}
      onCancel={hideModal}
      okButtonProps={{ loading }}
    >
      <Form
        name="Create"
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 20 }}
        style={{ maxWidth: 600 }}
        autoComplete="off"
        form={form}
      >
        <Form.Item<FieldType>
          label={t('name')}
          name="name"
          rules={[{ required: true, message: t('namePlaceholder') }]}
        >
          <Input placeholder={t('namePlaceholder')} onKeyDown={handleKeyDown} />
        </Form.Item>
        <Form.Item<FieldType>
          label={t('permission')}
          name="permission"
          initialValue="me"
        >
          <Select
            placeholder={t('permissionPlaceholder')}
            options={[
              { label: t('permissionMyself'), value: 'me' },
              { label: t('permissionTeam'), value: 'team' },
              { label: t('permissionPublic'), value: 'public' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default KnowledgeCreatingModal;
