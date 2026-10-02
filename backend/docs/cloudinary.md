# Cloudinary setup and private PDF storage

1. Create a Cloudinary account and select the product environment for SkillProof.
2. Find its cloud name and server API key/secret in the dashboard.
3. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in backend `.env` or Render's environment.
4. Keep these values entirely server-side. The frontend uses only SkillProof's API, with no direct upload credentials or unsigned preset.

`uploadResume` uses the Cloudinary Node SDK upload stream with `resource_type: raw`, `type: authenticated`, `overwrite: false`, and a random public ID `skillproof/resumes/UUID.pdf`. The request buffer is streamed without writing an upload directory. Raw resources keep the original PDF bytes; the `.pdf` extension belongs in the public ID. The SDK performs the signed upload using server credentials.

MongoDB stores only `{ public_id, secure_url, resource_type, type, format, bytes }` for the media. Resume text is parsed into structured fields; no binary data is stored in MongoDB. The response serializer exposes only PDF format/size and filename, never a signed delivery URL or public ID. An authenticated delivery URL is not a public download link. The current UI does not offer PDF download/preview.

If a Cloudinary account restricts PDF delivery, review the account's security settings for your intended usage. The current analysis parses the in-memory upload and does not rely on public PDF delivery, so making all PDF assets public is not required. For a future preview, add a separately authorized short-lived delivery flow; do not switch resumes to public upload delivery.

On parsing/database-creation failure, the service attempts `destroy` with `resource_type: raw` and `type: authenticated`. Deleting a completed/failed report destroys the asset with invalidation before deleting linked job records and the candidate analysis. If cloud deletion fails, the API returns 502 so it can be retried. Orphans after process death or a failed rollback must be reconciled operationally; no background retention/reconciliation service is claimed.

Resume files remain until deleted. Access-key possession grants report access, so keep downloaded key files private. Cloudinary quotas and account policy are managed in its dashboard. Reference: [Cloudinary upload parameters and delivery types](https://cloudinary.com/documentation/upload_parameters).
