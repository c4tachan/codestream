import React, { useState, useEffect } from "react";
import { PRSelectorButtons, PRSubmitReviewButton } from "./PullRequestComponents";
import styled from "styled-components";
import { useDidMount } from "../utilities/hooks";
import { useSelector, useDispatch } from "react-redux";
import { CodeStreamState } from "../store";
import { PullRequestFilesChanged } from "./PullRequestFilesChanged";
import { FileStatus } from "@codestream/protocols/api";
import { LoadingMessage } from "../src/components/LoadingMessage";
import { setUserPreference } from "./actions";
import { PullRequestPatch } from "./PullRequestPatch";
import copy from "copy-to-clipboard";
import {
	FetchThirdPartyPullRequestPullRequest,
	GetReposScmRequestType,
	ReadTextFileRequestType,
	WriteTextFileRequestType
} from "@codestream/protocols/agent";
import Icon from "./Icon";
import { Button } from "../src/components/Button";
import { PullRequestFinishReview } from "./PullRequestFinishReview";
import { Checkbox } from "../src/components/Checkbox";
import { HostApi } from "../webview-api";
import { Link } from "./Link";
import { getProviderPullRequestRepo } from "../store/providerPullRequests/reducer";
import { EditorRevealRangeRequestType } from "@codestream/protocols/webview";
import * as path from "path-browserify";
import { Range } from "vscode-languageserver-types";
import Tooltip from "./Tooltip";

export const PRDiffHunks = styled.div`
	font-family: Menlo, Consolas, "DejaVu Sans Mono", monospace;
	white-space: pre;
	margin-right: 10px;
}
`;

export const PRDiffHunk = styled.div`
	border: 1px solid var(--base-border-color);
	border-radius: 5px;
	margin: 0 0 20px 0;
	h1 {
		display: flex;
		align-items: center;
		border-radius: 5px 5px 0 0;
		font-size: 12px;
		font-weight: normal;
		margin: 0;
		padding: 10px;
		background: var(--base-background-color);
		border-bottom: 1px solid var(--base-border-color);
		width: 100%;
		overflow: hidden;
		.filename-container {
			overflow: hidden;
			text-overflow: ellipsis;
		}
		&.hidden {
			border-bottom: none;
			border-radius: 5px;
		}
		.toggle {
			display: inline-block;
			margin-right: 5px;
			margin-top: -2px;
		}
		.viewed {
			flex-shrink: 0;
			margin-left: auto;
		}
		a .icon {
			color: var(--text-color);
		}
	}
`;

const PRProgress = styled.div`
	flex-grow: 1;
	margin-left: auto;
	margin-right: 10px;
	padding-bottom: 12px;
	position: relative;
	.icon {
		margin-left: 10px;
	}
	max-width: 150px;
`;

const PRProgressLine = styled.div`
	width: 100%;
	height: 8px;
	border-radius: 4px;
	overflow: hidden;
	background: var(--base-border-color);
	position: absolute;
	bottom: 0;
	left: 0;
`;

const PRProgressFill = styled.div`
	height: 8px;
	background: var(--text-color-info);
	// background: #7aba5d;
	background-color: #24a100;
	position: absolute;
	bottom: 0;
	left: 0;
`;

const STATUS_MAP = {
	modified: FileStatus.modified
};

const NOW = new Date().getTime(); // a rough timestamp so we know when the file was visited

export interface CompareFilesProps {
	repositoryName?: string;
	baseRef: string;
	baseRefName: string;
	headRef: string;
	headRefName: string;
}

interface Props extends CompareFilesProps {
	filesChanged: any[];
	isLoading: boolean;
	pr?: FetchThirdPartyPullRequestPullRequest;
	fetch?: Function;
	setIsLoadingMessage?: Function;
}

export const PullRequestFilesChangedList = (props: Props) => {
	const { filesChanged, fetch, isLoading, pr } = props;
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			currentRepo: getProviderPullRequestRepo(state),
			pullRequestFilesChangedMode: state.preferences.pullRequestFilesChangedMode || "files"
		};
	});

	const [finishReviewOpen, setFinishReviewOpen] = useState(false);
	const [errorMessage, setErrorMessage] = React.useState<string | React.ReactNode>("");

	const setMode = mode => {
		dispatch(setUserPreference(["pullRequestFilesChangedMode"], mode));
	};

	const [visitedFiles, setVisitedFiles] = React.useState({ _latest: 0 });
	const [currentRepoRoot, setCurrentRepoRoot] = React.useState("");
	const [isLoadingVisited, setIsLoadingVisited] = React.useState(true);

	const visitFile = (filename: string, index: number) => {
		const hideKey = "hidden:" + filename;
		const newVisitedFiles = { ...visitedFiles, [filename]: NOW, [hideKey]: true, _latest: index };
		saveVisitedFiles(newVisitedFiles);
	};

	const unVisitFile = (filename: string) => {
		const hideKey = "hidden:" + filename;
		const newVisitedFiles = { ...visitedFiles, [filename]: false, [hideKey]: false };
		saveVisitedFiles(newVisitedFiles);
	};

	const hideFile = (filename: string, hide: boolean) => {
		const key = "hidden:" + filename;
		const newVisitedFiles = { ...visitedFiles, [key]: hide };
		saveVisitedFiles(newVisitedFiles);
	};

	const toggleDirectory = hideKey => {
		const newVisitedFiles = { ...visitedFiles, [hideKey]: !visitedFiles[hideKey] };
		saveVisitedFiles(newVisitedFiles);
	};

	const saveVisitedFiles = newVisitedFiles => {
		HostApi.instance.send(WriteTextFileRequestType, {
			path: `${props.baseRef}-${props.headRef}.json`,
			contents: JSON.stringify(newVisitedFiles, null, 4)
		});
		setVisitedFiles(newVisitedFiles);
	};

	useEffect(() => {
		(async () => {
			const response = (await HostApi.instance.send(ReadTextFileRequestType, {
				path: `${props.baseRef}-${props.headRef}.json`
			})) as any;

			try {
				setIsLoadingVisited(false);
				setVisitedFiles(JSON.parse(response.contents || "{}"));
			} catch (ex) {
				console.warn("Error parsing JSON data: ", response.contents);
			}
		})();
	}, [pr, filesChanged]);

	const commentMap = React.useMemo(() => {
		const map = {} as any;
		const reviews = pr
			? pr.timelineItems.nodes.filter(node => node.__typename === "PullRequestReview")
			: [];
		reviews.forEach(review => {
			if (review.comments) {
				review.comments.nodes.forEach(comment => {
					if (!map[comment.path]) map[comment.path] = [];
					map[comment.path].push({ review, comment });
				});
			}
		});
		return map;
	}, [pr]);

	if (isLoading || isLoadingVisited)
		return (
			<div style={{ marginTop: "100px" }}>
				<LoadingMessage>Loading Changed Files...</LoadingMessage>
			</div>
		);

	if (!filesChanged || !filesChanged.length) return null;

	const mode = derivedState.pullRequestFilesChangedMode;

	const openFile = async filename => {
		let repoRoot = currentRepoRoot;
		if (!repoRoot) {
			const response = await HostApi.instance.send(GetReposScmRequestType, {
				inEditorOnly: false
			});
			if (!response.repositories) return;
			const currentRepoInfo = response.repositories.find(
				r => r.id === derivedState.currentRepo!.id
			);
			if (currentRepoInfo) {
				setCurrentRepoRoot(currentRepoInfo.path);
				repoRoot = currentRepoInfo.path;
			}
		}

		const result = await HostApi.instance.send(EditorRevealRangeRequestType, {
			uri: path.join("file://", repoRoot, filename),
			range: Range.create(0, 0, 0, 0)
		});

		if (!result.success) {
			setErrorMessage("Could not open file");
		}

		HostApi.instance.track("PR File Viewed", {
			Host: props.pr && props.pr.providerId
		});
	};

	let insertText: Function;
	let insertNewline: Function;
	let focusOnMessageInput: Function;

	const __onDidRender = functions => {
		insertText = functions.insertTextAtCursor;
		insertNewline = functions.insertNewlineAtCursor;
		focusOnMessageInput = functions.focus;
	};

	const quote = text => {
		if (!insertText) return;
		// handleTextInputFocus(comment.databaseId);
		focusOnMessageInput &&
			focusOnMessageInput(() => {
				insertText && insertText(text.replace(/^/gm, "> "));
				insertNewline && insertNewline();
			});
	};

	const totalFiles = filesChanged.length;
	const totalVisitedFiles = filesChanged.filter(_ => visitedFiles[_.filename]).length;
	const pct = totalFiles > 0 ? (100 * totalVisitedFiles) / totalFiles : 0;

	return (
		<>
			<div style={{ display: "flex", alignItems: "center" }}>
				<div style={{ marginRight: "10px", flexGrow: 2 }}>
					<PRSelectorButtons>
						<span className={mode == "files" ? "selected" : ""} onClick={() => setMode("files")}>
							<Icon name="list-flat" title="List View" placement="bottom" />
						</span>
						<span className={mode == "tree" ? "selected" : ""} onClick={() => setMode("tree")}>
							<Icon name="list-tree" title="Tree View" placement="bottom" />
						</span>
						<span className={mode == "hunks" ? "selected" : ""} onClick={() => setMode("hunks")}>
							<Icon name="file-diff" title="Diff Hunks" placement="bottom" />
						</span>
					</PRSelectorButtons>
				</div>
				<PRProgress style={{ marginLeft: "auto" }}>
					{totalVisitedFiles} / {totalFiles}{" "}
					<span className="wide-text">
						files viewed{" "}
						<Icon
							name="info"
							placement="bottom"
							title={
								<div style={{ width: "250px" }}>
									Marking files as viewed can help keep track of your progress, but will not affect
									your submitted review
								</div>
							}
						/>
					</span>
					<PRProgressLine>
						{pct > 0 && <PRProgressFill style={{ width: pct + "%" }} />}
					</PRProgressLine>
				</PRProgress>
				{pr && !pr.pendingReview && (
					<PRSubmitReviewButton style={{ marginTop: 0, marginRight: "10px" }}>
						<Button variant="success" onClick={() => setFinishReviewOpen(!finishReviewOpen)}>
							Review<span className="wide-text"> changes</span> <Icon name="chevron-down" />
						</Button>
						{finishReviewOpen && (
							<PullRequestFinishReview
								pr={pr}
								mode="dropdown"
								fetch={props.fetch!}
								setIsLoadingMessage={props.setIsLoadingMessage!}
								setFinishReviewOpen={setFinishReviewOpen}
							/>
						)}
					</PRSubmitReviewButton>
				)}
			</div>
			<div style={{ height: "10px" }} />
			{mode === "files" || mode === "tree" ? (
				<PullRequestFilesChanged
					pr={pr}
					filesChanged={filesChanged}
					repositoryName={props.repositoryName}
					baseRef={props.baseRef}
					baseRefName={props.baseRefName}
					headRef={props.headRef}
					headRefName={props.headRefName}
					isLoading={props.isLoading}
					viewMode={mode === "files" ? "files" : "tree"}
					visitFile={visitFile}
					unVisitFile={unVisitFile}
					visitedFiles={visitedFiles}
					toggleDirectory={toggleDirectory}
					commentMap={commentMap}
				/>
			) : (
				<PRDiffHunks>
					{filesChanged.map((_, index) => {
						const hideKey = "hidden:" + _.filename;
						const hidden = visitedFiles[hideKey];
						const visited = visitedFiles[_.filename];
						const comments = commentMap[_.filename] || [];
						return (
							<PRDiffHunk key={index}>
								<h1 className={hidden ? "hidden" : ""}>
									<Icon
										name={hidden ? "chevron-right-thin" : "chevron-down-thin"}
										className="toggle clickable"
										onClick={() => hideFile(_.filename, !hidden)}
									/>
									<span className="filename-container">
										<span className="filename">{_.filename}</span>{" "}
										<Icon
											title="Copy File Path"
											placement="bottom"
											name="copy"
											className="clickable"
											onClick={e => copy(_.filename)}
										/>{" "}
										{pr && (
											<Link
												href={pr.url.replace(
													/\/pull\/\d+$/,
													`/blob/${props.headRef}/${_.filename}`
												)}
											>
												<Icon
													title="Open File on Remote"
													placement="bottom"
													name="link-external"
													className="clickable"
												/>{" "}
											</Link>
										)}
										{
											<Icon
												name="goto-file"
												className="clickable action"
												title="Open Local File"
												placement="bottom"
												delay={1}
												onClick={async e => {
													e.stopPropagation();
													e.preventDefault();
													openFile(_.filename);
												}}
											/>
										}
									</span>
									<Tooltip title="Mark as Viewed" placement="bottom" delay={1}>
										<span className="viewed">
											<Checkbox
												name={"viewed-" + _.filename}
												checked={visited}
												onChange={() =>
													visited ? unVisitFile(_.filename) : visitFile(_.filename, index)
												}
												noMargin
											>
												<span className="wide-text">Viewed</span>
											</Checkbox>
										</span>
									</Tooltip>
								</h1>
								{!hidden && (
									<PullRequestPatch
										pr={pr}
										patch={_.patch}
										hunks={_.hunks}
										filename={_.filename}
										canComment
										comments={comments}
										setIsLoadingMessage={props.setIsLoadingMessage}
										quote={quote}
										fetch={props.fetch!}
									/>
								)}
							</PRDiffHunk>
						);
					})}
				</PRDiffHunks>
			)}
		</>
	);
};
