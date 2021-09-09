import { RequestType } from "vscode-languageserver-protocol";
import { CSCompany, CSTeam } from "./api.protocol";
import { CSStream } from "./api.protocol.models";

export interface FetchCompaniesRequest {
	mine?: boolean;
	companyIds?: string[];
}

export interface FetchCompaniesResponse {
	companies: CSCompany[];
}

export const FetchCompaniesRequestType = new RequestType<
	FetchCompaniesRequest,
	FetchCompaniesResponse,
	void,
	void
>("codestream/companies");

export interface GetCompanyRequest {
	companyId: string;
}

export interface GetCompanyResponse {
	company: CSCompany;
}

export const GetCompanyRequestType = new RequestType<
	GetCompanyRequest,
	GetCompanyResponse,
	void,
	void
>("codestream/company");

export interface CreateCompanyRequest {
	name: string;
}

export interface CreateCompanyResponse {
	company: CSCompany;
	team: CSTeam;
	streams?: CSStream[];
}

export const CreateCompanyRequestType = new RequestType<
	CreateCompanyRequest,
	CreateCompanyResponse,
	void,
	void
>("codestream/company/create");
