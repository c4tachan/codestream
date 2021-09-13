import React, { useState, useCallback } from "react";

import Button from "../Stream/Button";
import { Link } from "../Stream/Link";
import { FormattedMessage } from "react-intl";
import { goToLogin } from "../store/context/actions";
import { useDispatch } from "react-redux";
import { Separator } from "./Separator";
import Icon from "../Stream/Icon";
import { useDidMount } from "../utilities/hooks";
import { JoinTeam } from "./JoinTeam";
import styled from "styled-components";
import { TextInput } from "./TextInput";
import { HostApi } from "..";
import { completeSignup } from "./actions";
import { Checkbox } from "../src/components/Checkbox";
import {
	CreateCompanyRequestType,
	JoinCompanyRequestType,
	JoinCompanyResponse
} from "@codestream/protocols/agent";
import { changeRegistrationEmail } from "../store/session/actions";
import { CSCompany, CSEligibleJoinCompany } from "@codestream/protocols/api";

export const CheckboxRow = styled.div`
	padding: 5px 0 5px 0;
`;

const isTeamNameValid = (name: string) => name.length > 0;

interface EnhancedCSCompany {
	id: string;
	memberCount?: number;
	name: string;
	_type: "Domain" | "Invite Detected";
}

export function CompanyCreation(props: {
	userId?: string;
	email?: string;
	token?: string;
	domain?: string;
	provider?: string;
	isWebmail?: string;
	onComplete?: Function;
	companies?: CSCompany[];
	eligibleJoinCompanies?: CSEligibleJoinCompany[];
}) {
	const dispatch = useDispatch();

	const onClickTryAnother = useCallback(async (event: React.FormEvent) => {
		event.preventDefault();
		dispatch(changeRegistrationEmail(props.userId!));
	}, []);

	const [organizations, setOrganizations] = React.useState<EnhancedCSCompany[]>([]);
	const [isLoading, setIsLoading] = React.useState(false);
	const [isLoadingJoinTeam, setIsLoadingJoinTeam] = React.useState(false);
	const [step, setStep] = React.useState<number>(0);
	const initialCompanyName =
		props.email && !props.isWebmail ? props.email.split("@")[1].split(".")[0] : "";
	const [organizationSettings, setOrganizationSettings] = React.useState<{
		companyName?: string;
		allowDomainJoining?: boolean;
	}>({
		companyName: initialCompanyName
			? initialCompanyName.charAt(0).toUpperCase() + initialCompanyName.slice(1)
			: ""
	});
	const [teamNameValidity, setTeamNameValidity] = useState(true);

	const onValidityChanged = useCallback((field: string, validity: boolean) => {
		switch (field) {
			case "company": {
				setTeamNameValidity(validity);
				break;
			}
			default: {
			}
		}
	}, []);

	// const derivedState = useSelector((state: CodeStreamState) => {
	// 	return {
	// 		userId: state.session.userId
	// 	};
	// });

	useDidMount(() => {
		if (props.eligibleJoinCompanies || props.companies) {
			setIsLoading(true);
			let obj = {};
			if (props.eligibleJoinCompanies) {
				props.eligibleJoinCompanies.forEach(_ => {
					obj[_.id] = { ..._, _type: "Domain" };
				});
			}
			if (props.companies) {
				props.companies.forEach(_ => {
					obj[_.id] = { ..._, _type: "Invite Detected" };
				});
			}

			setOrganizations(
				Object.keys(obj).map(_ => {
					return obj[_];
				}) as EnhancedCSCompany[]
			);

			setIsLoading(false);
		}
	});

	const onClickBeginCreateOrganization = () => {
		HostApi.instance.track("New Organization Initiated", {
			"Available Organizations": organizations?.length > 0
		});
		setStep(1);
	};

	const domain = React.useMemo(() => {
		return props.email?.split("@")[1].toLowerCase();
	}, [props.email]);

	const onClickCreateOrganization = async event => {
		event.preventDefault();
		if (
			organizationSettings.companyName != null &&
			organizationSettings.companyName !== "" &&
			teamNameValidity
		) {
			setIsLoading(true);
			try {
				const { team, company } = await HostApi.instance.send(CreateCompanyRequestType, {
					name: organizationSettings.companyName!,
					domainJoining:
						organizationSettings?.allowDomainJoining == true && domain ? [domain] : undefined
				});
				HostApi.instance.track("New Organization Created", {
					"Domain Joining": props.isWebmail
						? "Not Available"
						: organizationSettings?.allowDomainJoining
						? "On"
						: "Off"
					// "Code Host Joining": ""
				});

				dispatch(
					completeSignup(props.email!, props.token!, team.id, {
						createdTeam: true,
						provider: props.provider
					})
				);
			} catch (error) {
				// TODO: communicate error
				dispatch(goToLogin());
			}
		}
	};

	const onClickJoinOrganization = async (organization: EnhancedCSCompany) => {
		setIsLoadingJoinTeam(true);

		try {
			const result = (await HostApi.instance.send(JoinCompanyRequestType, {
				companyId: organization.id
			})) as JoinCompanyResponse;

			HostApi.instance.track("Joined Organization", {
				Availability: organization._type
			});
			dispatch(
				completeSignup(props.email!, props.token!, result.team.id, {
					createdTeam: true,
					provider: props.provider
				})
			);
		} catch (ex) {
			// TODO: communicate error
			dispatch(goToLogin());
		}
	};

	return (
		<div id="organization-page" className="onboarding-page">
			{step === 0 && (
				<>
					<div className="standard-form">
						<fieldset className="form-body">
							<div id="controls">
								<div className="border-bottom-box">
									<h3>
										<FormattedMessage
											id="signUp.createOrganization"
											defaultMessage="Create a new CodeStream organization"
										/>
									</h3>
									<p>
										<FormattedMessage
											id="signUp.createOrganizationHelp"
											defaultMessage="An organization on CodeStream is a place where all of the developers in your company can discuss and review code"
										/>
									</p>

									<Button className="row-button" onClick={onClickBeginCreateOrganization}>
										<div className="copy">Create Organization</div>
										<Icon name="chevron-right" />
									</Button>
									<Separator />
								</div>
							</div>
						</fieldset>
					</div>
					<div className="standard-form">
						<fieldset className="form-body">
							<div id="controls">
								<div className="border-bottom-box">
									<h3>
										<FormattedMessage
											id="signUp.joinOrganization"
											defaultMessage="Join an existing organization"
										/>
									</h3>
									<br />
									{isLoading && (
										<div>
											<Icon name="sync" loading={true} /> Loading organizations...
										</div>
									)}
									<div>
										{!isLoading && (
											<>
												{organizations.map(_ => {
													return (
														<div className="key-value-actions pt-3">
															<div className="key-value-key">
																{_.name} <br />
																{_.memberCount} member{_.memberCount == 1 ? "" : "s"}
															</div>
															<div className="key-value-value">
																<Button
																	onClick={e => onClickJoinOrganization(_)}
																	className="control-button"
																	loading={isLoadingJoinTeam}
																>
																	<div className="copy">
																		<b>Join</b>
																	</div>
																</Button>
															</div>
														</div>
													);
												})}
												{!organizations.length && (
													<>
														<div>
															We didn't find any organizations for you to join
															<br />
															<Link onClick={onClickTryAnother}>
																Try using a different email address
															</Link>
															<br /> <br />
															Were you invited?
															<br />
														</div>
														<div className="control-group">
															<JoinTeam useComponent={true} />
														</div>
													</>
												)}
											</>
										)}
									</div>
								</div>
							</div>
						</fieldset>
					</div>
				</>
			)}
			{step === 1 && (
				<>
					<div className="standard-form">
						<fieldset className="form-body">
							<div id="controls">
								<div className="border-bottom-box">
									<h3>
										<FormattedMessage
											id="signUp.nameOrganization"
											defaultMessage="Name your organization"
										/>
									</h3>
									<br />
									<TextInput
										name="company"
										value={organizationSettings?.companyName || ""}
										onValidityChanged={onValidityChanged}
										validate={isTeamNameValid}
										onChange={(value: string) => {
											setOrganizationSettings({
												...organizationSettings,
												companyName: value
											});
										}}
										placeholder="Ex: your company name"
									/>
									{!teamNameValidity && <small className="explainer error-message">Required</small>}

									<br />
									<br />
									{domain && !props.isWebmail && (
										<CheckboxRow>
											<Checkbox
												name="allowDomainBaseJoining"
												onChange={(value: boolean) => {
													setOrganizationSettings({
														...organizationSettings,
														allowDomainJoining: value
													});
												}}
											>
												Let anyone with the <b>{domain}</b> email address join this organization
											</Checkbox>
										</CheckboxRow>
									)}

									{/* <CheckboxRow>
										<Checkbox name="somethingElse" onChange={(value: boolean) => {}}>
											Let anyone in the following GitHub organization join
										</Checkbox>
									</CheckboxRow> */}
									<Button
										className="row-button"
										onClick={onClickCreateOrganization}
										loading={isLoading}
									>
										<div className="copy">Next</div>
										<Icon name="chevron-right" />
									</Button>
								</div>
							</div>
							<div className="footer">
								<Link
									onClick={e => {
										e.preventDefault();
										setStep(0);
									}}
								>
									<p>{"< Back"}</p>
								</Link>
							</div>
						</fieldset>
					</div>
				</>
			)}
		</div>
	);
}
