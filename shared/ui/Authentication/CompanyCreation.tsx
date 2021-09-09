import React, { useState, useCallback } from "react";

import Button from "../Stream/Button";
import { Link } from "../Stream/Link";
import { FormattedMessage } from "react-intl";
import { goToLogin, goToSignup } from "../store/context/actions";
import { useDispatch, useSelector } from "react-redux";
import { Separator } from "./Separator";
import Icon from "../Stream/Icon";
import { useDidMount } from "../utilities/hooks";
import { JoinTeam } from "./JoinTeam";
import styled from "styled-components";
import { TextInput } from "./TextInput";
import { HostApi } from "..";
import { completeSignup } from "./actions";
import { Checkbox } from "../src/components/Checkbox";
import { CreateCompanyRequestType } from "@codestream/protocols/agent";

export const CheckboxRow = styled.div`
	padding: 5px 0 5px 0;
`;

const isTeamNameValid = (name: string) => name.length > 0;

export function CompanyCreation(props: {
	email?: string;
	token?: string;
	domain?: string;
	provider?: string;
	onComplete?: Function;
}) {
	const dispatch = useDispatch();

	const onClickGoBack = useCallback((event: React.FormEvent) => {
		event.preventDefault();
		dispatch(goToSignup({}));
	}, []);

	const [organizations, setOrganizations] = React.useState<
		{ name: string; id: string; memberCount: number }[]
	>([]);
	const [isLoading, setIsLoading] = React.useState(false);
	const [step, setStep] = React.useState<number>(0);
	const [organizationSettings, setOrganizationSettings] = React.useState<{
		companyName?: string;
		allowDomainBaseJoining?: boolean;
	}>({});
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
		setIsLoading(true);
		setTimeout(() => {
			setOrganizations([
				{
					id: "1",
					name: "YourCompany",
					memberCount: 42
				}
			]);
			setIsLoading(false);
		}, 1200);
	});

	const onClickBeginCreateOrganization = () => {
		HostApi.instance.track("New Organization Initiated", {
			"Available Organizations": organizations?.length > 0
		});
		setStep(1);
	};

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
					name: organizationSettings.companyName!
				});
				HostApi.instance.track("New Organization Created", {
					"Domain Joining": organizationSettings?.allowDomainBaseJoining ? "" : "",
					"Code Host Joining": ""
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

	const onClickJoinOrganization = (organization: any) => {
		console.warn(organization.id);

		HostApi.instance.track("Joined Organization", {
			Availability: ""
		});
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
															<Link onClick={onClickGoBack}>
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

							<div className="footer">
								<Link onClick={onClickGoBack}>
									<p>{"< Back"}</p>
								</Link>
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
									<CheckboxRow>
										<Checkbox
											name="allowDomainBaseJoining"
											onChange={(value: boolean) => {
												setOrganizationSettings({
													...organizationSettings,
													allowDomainBaseJoining: value
												});
											}}
										>
											Let anyone with an <b>acme.com</b> email address join this organization
										</Checkbox>
									</CheckboxRow>
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
