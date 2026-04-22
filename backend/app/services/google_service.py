"""
Google Workspace integration service.
Fetches document edit history from Google Drive Activity API.
"""

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from app.config import get_settings
from typing import Optional


class GoogleService:
    """Client for Google Drive Activity API."""

    def __init__(self, access_token: str, refresh_token: Optional[str] = None):
        settings = get_settings()
        self.creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            token_uri="https://oauth2.googleapis.com/token",
        )

    def get_doc_activity(self, file_id: str, page_size: int = 100) -> list[dict]:
        """
        Fetch per-user edit activity for a Google Doc/Sheet/Slide.

        Uses the Drive Activity API v2 to retrieve edit events.
        Returns normalized activity records.
        """
        service = build("driveactivity", "v2", credentials=self.creds)

        all_activities = []
        page_token = None

        while True:
            body = {
                "itemName": f"items/{file_id}",
                "pageSize": page_size,
                "filter": "detail.action_detail_case:EDIT",
            }
            if page_token:
                body["pageToken"] = page_token

            response = service.activity().query(body=body).execute()
            activities = response.get("activities", [])

            for act in activities:
                timestamp = act.get("timestamp") or act.get("timeRange", {}).get("endTime")
                actors = act.get("actors", [])

                for actor in actors:
                    user_info = actor.get("user", {})
                    known_user = user_info.get("knownUser", {})

                    # Extract targets
                    targets = act.get("targets", [])
                    target_name = ""
                    if targets:
                        drive_item = targets[0].get("driveItem", {})
                        target_name = drive_item.get("title", file_id)

                    all_activities.append({
                        "person_name": known_user.get("personName", ""),
                        "is_current_user": known_user.get("isCurrentUser", False),
                        "occurred_at": timestamp,
                        "event_type": "doc_edit",
                        "target_file_id": file_id,
                        "target_file_name": target_name,
                        "action_detail": self._extract_action_detail(act),
                    })

            page_token = response.get("nextPageToken")
            if not page_token:
                break

        return all_activities

    def get_drive_file_info(self, file_id: str) -> dict:
        """Get basic info about a Google Drive file."""
        service = build("drive", "v3", credentials=self.creds)
        file_info = service.files().get(
            fileId=file_id,
            fields="id,name,mimeType,owners,createdTime,modifiedTime",
        ).execute()
        return file_info

    def get_revision_history(self, file_id: str) -> list[dict]:
        """
        Get revision history for a Google Doc/Sheet/Slide.
        Each revision includes the modifier and timestamp.
        """
        service = build("drive", "v3", credentials=self.creds)
        revisions = []
        page_token = None

        while True:
            resp = service.revisions().list(
                fileId=file_id,
                fields="revisions(id,modifiedTime,lastModifyingUser),nextPageToken",
                pageToken=page_token,
                pageSize=100,
            ).execute()

            for rev in resp.get("revisions", []):
                user = rev.get("lastModifyingUser", {})
                revisions.append({
                    "revision_id": rev.get("id"),
                    "modified_at": rev.get("modifiedTime"),
                    "user_email": user.get("emailAddress", ""),
                    "user_name": user.get("displayName", ""),
                })

            page_token = resp.get("nextPageToken")
            if not page_token:
                break

        return revisions

    @staticmethod
    def _extract_action_detail(activity: dict) -> str:
        """Extract a human-readable action detail from an activity record."""
        primary_action = activity.get("primaryActionDetail", {})
        if "edit" in primary_action:
            return "edit"
        if "create" in primary_action:
            return "create"
        if "comment" in primary_action:
            return "comment"
        return "unknown"
