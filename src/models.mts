export interface ModelPullReportOutputFieldInfo {
    name: string;
    datatype: string;
}

export interface ModelPullReportInputInfo {
    name: string;
    datatype: string;
    validation_regex?: string;
    validation_message?: string;
}

export interface ModelPullResponse {
    data: any | undefined;
    error?: string;
}

export interface ModelPullReportInfo {
    name: string;
    input: ModelPullReportInputInfo[];
    output: ModelPullReportOutputFieldInfo[];
}

export interface TallyStaticVariable {
    name: string;
    value: string;
}

export interface TallyFieldDefinition {
    name: string;
    datatype: string;
    expression?: string;
    description?: string;
}

export interface TallyFilterDefinition {
    name: string;
    expression: string;
}

export interface TallyCollectionDefinition {
    collection: string;
    description?: string;
    fields: TallyFieldDefinition[];
}

export interface TallyActionVariableDefinition {
    name: string;
    value: string;
}

export interface TallyActionDefinition {
    targetReport: string;
    variables: TallyActionVariableDefinition[];
}

export interface CreateUpdateDeleteStatus {
    created?: number;
    altered?: number;
    deleted?: number;
    combined?: number;
    ignored?: number;
    cancelled?: number;
    exceptions?: number;
}