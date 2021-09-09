import React from "react";
import { TextInput } from "../Authentication/TextInput";
import { Button } from "../src/components/Button";
import { FormattedMessage } from "react-intl";
import { CodeStreamState } from "../store";
import { useSelector, useDispatch } from "react-redux";
import { switchToTeam } from "../store/session/actions";
import { CSCompany } from "@codestream/protocols/api";
import { wait } from "../utils";
import { Dialog } from "../src/components/Dialog";
import { closeModal } from "./actions";
import { createCompany } from "../store/companies/actions";

export function CreateCompanyPage() {
	const dispatch = useDispatch();
	const [companyName, setCompanyName] = React.useState("");
	const [teamNameValidity, setTeamNameValidity] = React.useState(true);
	const [companyNameValidity, setCompanyNameValidity] = React.useState(true);
	const { currentCompanyId, companies } = useSelector((state: CodeStreamState) => {
		return {
			currentCompanyId: state.teams[state.context.currentTeamId].companyId,
			companies: state.companies
		};
	});

	const [isLoading, setIsLoading] = React.useState(false);
	const isCompanyNameUnique = (name: string) => {
		return !Object.values(companies).some(c => c.name.toLowerCase() === name.toLowerCase());
	};

	const isCompanyNameValid = (name: string) => {
		return name.length > 0 && isCompanyNameUnique(name);
	};

	const onValidityChanged = (field: string, validity: boolean) =>
		field === "company" ? setTeamNameValidity(validity) : setCompanyNameValidity(validity);

	const validateOrgName = (name: string) => {
		const valid = isCompanyNameValid(name);
		setCompanyNameValidity(valid);
		return valid;
	};

	const onSubmit: React.FormEventHandler = async e => {
		e.preventDefault();
		if (!validateOrgName(companyName)) return;

		setIsLoading(true);

		try {
			const team = ((await dispatch(createCompany({ name: companyName }))) as unknown) as CSCompany;
			// artificial delay to ensure analytics from creating the team are actually processed before we logout below
			await wait(1000);
			await dispatch(switchToTeam(team.id));
		} catch (error) {
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog title="Create an Organization" onClose={() => dispatch(closeModal())}>
			<form className="standard-form" onSubmit={onSubmit}>
				<fieldset className="form-body">
					<div id="controls">
						<div className="control-group">
							<label>
								<FormattedMessage id="createCompany.name.label" />
							</label>
							<TextInput
								name="company"
								value={companyName}
								onChange={setCompanyName}
								validate={isCompanyNameValid}
								onValidityChanged={onValidityChanged}
								required
								autoFocus
							/>
							{!teamNameValidity && (
								<small className="explainer error-message">
									{companyName.length === 0
										? "Required"
										: !isCompanyNameUnique(companyName) && "Name already in use"}
								</small>
							)}
						</div>
						<br />
						<div className="button-group">
							<Button variant="primary" isLoading={isLoading}>
								<FormattedMessage id="createCompany.submitButton" />
							</Button>
						</div>
					</div>
				</fieldset>
			</form>
		</Dialog>
	);
}
