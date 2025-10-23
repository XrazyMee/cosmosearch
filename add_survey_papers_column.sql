-- 为 paper_survey_record 表添加 survey_papers 字段
ALTER TABLE paper_survey_record
ADD COLUMN survey_papers LONGTEXT NULL COMMENT '综述相关的文献列表(JSON格式)';
