import * as core from "@actions/core";
import { getOption, Option } from "./option";
import { githubClient, GitHubClient } from "./client";
import { getIssueOrPullRequestCommentWithPaging, IssueOrPullRequestWithPagingResult } from "./paging";
import { isHidableComment, createHidableComment } from "./comment";

async function handleIssue(
    option: Option,
    client: GitHubClient,
    loginUser: string,
    result: IssueOrPullRequestWithPagingResult
) {
    let targetCommentId: string | null = null;
    let targetCommentBody: string | null = null;
    for (const comment of result.comments) {
        if (comment.author?.login != loginUser) {
            continue;
        }
        if (isHidableComment(comment.body, option.id)) {
            targetCommentId = comment.id;
            targetCommentBody = comment.body;
            break;
        }
    }

    if (targetCommentId == null) {
        if (option.show) {
            await client.addComment({ id: result.id, body: createHidableComment(option.body, option.id) });
        }
    } else {
        if (option.show) {
            const expectBody = createHidableComment(option.body, option.id);
            if (expectBody != targetCommentBody) {
                await client.updateIssueComment({ id: targetCommentId, body: expectBody });
            }
        } else {
            await client.deleteIssuComment({ id: targetCommentId });
        }
    }
}

async function handlePullRequest(
    option: Option,
    client: GitHubClient,
    loginUser: string,
    result: IssueOrPullRequestWithPagingResult
) {
    let targetCommentId: string | null = null;
    let targetCommentBody: string | null = null;
    for (const comment of result.comments) {
        if (comment.author?.login != loginUser) {
            continue;
        }
        if (isHidableComment(comment.body, option.id)) {
            targetCommentId = comment.id;
            targetCommentBody = comment.body;
            break;
        }
    }

    if (targetCommentId == null) {
        if (option.show) {
            await client.addComment({ id: result.id, body: createHidableComment(option.body, option.id) });
        }
    } else {
        if (option.show) {
            const expectBody = createHidableComment(option.body, option.id);
            if (expectBody != targetCommentBody) {
                await client.updatePullRequestComment({ id: targetCommentId, body: expectBody });
            }
        } else {
            await client.deletePullRequestComment({ id: targetCommentId });
        }
    }
}

async function run() {
    try {
        const option = getOption();
        const client = githubClient(option);
        if (option.repository.includes("/") == false) {
            throw Error("invalid repository value");
        }
        const owner = option.repository.split("/")[0];
        const name = option.repository.split("/")[1];
        const loginUser = (await client.getLoginUser({})).viewer.login;
        const issueOrPullRequest = await getIssueOrPullRequestCommentWithPaging(client, {
            owner,
            name,
            number: option.number,
        });
        if (issueOrPullRequest.__typename == "Issue") {
            await handleIssue(option, client, loginUser, issueOrPullRequest);
        } else {
            await handlePullRequest(option, client, loginUser, issueOrPullRequest);
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
