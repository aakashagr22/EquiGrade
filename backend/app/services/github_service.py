"""
GitHub API integration service.
Fetches commits, PRs, reviews, and diffs from GitHub repositories.
"""

import httpx
from datetime import datetime
from typing import Optional
from app.config import get_settings


class GitHubService:
    """Client for GitHub REST API v3."""

    BASE_URL = "https://api.github.com"

    def __init__(self, access_token: str):
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    async def get_commits(
        self, owner: str, repo: str, since: Optional[datetime] = None, per_page: int = 100
    ) -> list[dict]:
        """Fetch commits from a repository, optionally since a timestamp."""
        all_commits = []
        page = 1
        async with httpx.AsyncClient(timeout=30) as client:
            while True:
                params = {"per_page": per_page, "page": page}
                if since:
                    params["since"] = since.isoformat()
                resp = await client.get(
                    f"{self.BASE_URL}/repos/{owner}/{repo}/commits",
                    headers=self.headers,
                    params=params,
                )
                resp.raise_for_status()
                data = resp.json()
                if not data:
                    break
                all_commits.extend(data)
                if len(data) < per_page:
                    break
                page += 1
        return all_commits

    async def get_commit_detail(self, owner: str, repo: str, sha: str) -> dict:
        """Fetch detailed commit info including files changed and stats."""
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self.BASE_URL}/repos/{owner}/{repo}/commits/{sha}",
                headers=self.headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_commit_diff(self, owner: str, repo: str, sha: str) -> str:
        """Fetch raw unified diff for a commit."""
        async with httpx.AsyncClient(timeout=30) as client:
            diff_headers = {**self.headers, "Accept": "application/vnd.github.diff"}
            resp = await client.get(
                f"{self.BASE_URL}/repos/{owner}/{repo}/commits/{sha}",
                headers=diff_headers,
            )
            resp.raise_for_status()
            return resp.text

    async def get_pull_requests(
        self, owner: str, repo: str, state: str = "all", per_page: int = 100
    ) -> list[dict]:
        """Fetch pull requests from a repository."""
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self.BASE_URL}/repos/{owner}/{repo}/pulls",
                headers=self.headers,
                params={"state": state, "per_page": per_page},
            )
            resp.raise_for_status()
            return resp.json()

    async def get_pr_reviews(self, owner: str, repo: str, pr_number: int) -> list[dict]:
        """Fetch reviews for a specific pull request."""
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self.BASE_URL}/repos/{owner}/{repo}/pulls/{pr_number}/reviews",
                headers=self.headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_repo_contributors(self, owner: str, repo: str) -> list[dict]:
        """Fetch contributor stats for a repository."""
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self.BASE_URL}/repos/{owner}/{repo}/contributors",
                headers=self.headers,
                params={"per_page": 100},
            )
            resp.raise_for_status()
            return resp.json()

    @staticmethod
    def parse_repo_url(external_id: str) -> tuple[str, str]:
        """
        Parse 'owner/repo' or a full GitHub URL into (owner, repo).
        Accepts: 'owner/repo', 'https://github.com/owner/repo', 'github.com/owner/repo'
        """
        external_id = external_id.strip().rstrip("/")
        if "github.com/" in external_id:
            parts = external_id.split("github.com/")[1].split("/")
            return parts[0], parts[1]
        parts = external_id.split("/")
        return parts[0], parts[1]
