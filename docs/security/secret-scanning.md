# Secret scanning

The blocking security workflow scans the complete Git history, including the current checked-out commit, with credential-free TruffleHog OSS. The checkout is mounted read-only in a read-only container; only an isolated /tmp tmpfs is writable. TruffleHog reports both verified and unknown results, fails on either class, fails on scan errors, and cannot self-update.

The workflow runs without path filters for every pull request to main, every push to main, and manual dispatch. It grants only contents: read. Checkout credentials are not persisted, and the secret-scan checkout uses fetch-depth: 0.

## Immutable upstream verification

The following pins were independently reverified against official upstream sources on 2026-08-24:

| Component | Immutable pin | Primary-source verification |
| --- | --- | --- |
| actions/checkout | 34e114876b0b11c390a56381ad16ebd13914f8d5 | The [official repository commit](https://github.com/actions/checkout/commit/34e114876b0b11c390a56381ad16ebd13914f8d5) and GitHub repository API returned the exact SHA. The moving v4 tag is not trusted as the workflow pin. |
| actions/setup-node | 49933ea5288caeca8642d1e84afbd3f7d6820020 | The [official repository commit](https://github.com/actions/setup-node/commit/49933ea5288caeca8642d1e84afbd3f7d6820020) and git ls-remote for the official v4.4.0 tag returned the exact SHA. |
| TruffleHog OSS | v3.96.0 / 6f3c981e7b77f235fd2702dd74af25fc4b72bf11 | The [official v3.96.0 release](https://github.com/trufflesecurity/trufflehog/releases/tag/v3.96.0) and git ls-remote for the official tag returned the exact commit. |
| TruffleHog Linux/amd64 image | sha256:b8acd9f7306d832b1f16e06003dac2283a737817954554111683ab7a56e9e539 | The [official GHCR package versions](https://github.com/trufflesecurity/trufflehog/pkgs/container/trufflehog/versions?filters%5Bversion_type%5D=tagged) list this digest specifically for 3.96.0-amd64. |

The scanner deliberately uses the platform-specific GHCR digest with --platform linux/amd64, not a mutable tag or the multi-architecture manifest digest. Any upgrade must update the script, its contract test, and this evidence together after repeating the official-repository and official-GHCR checks.

## Local use and failure policy

Run the same gate from the repository root with:

```sh
bash scripts/security/secret-scan.sh
```

Docker must be installed and its engine must be running. An unavailable engine, image-pull failure, scan error, verified finding, or unknown finding is a blocking failure; the script never converts these conditions into a skip. No TruffleHog commercial key, GitHub token, or other scanning credential is accepted or required.

## Suppressions

There are no repository suppressions today. A future suppression is allowed only for a demonstrated false positive or intentionally fake test fixture on the exact source line, using TruffleHog's supported trufflehog:ignore annotation. The reviewing change must include the detector, commit and path, redacted evidence that the value cannot authenticate, an owner, a rationale, and a removal date.

Path exclusions, detector-wide exclusions, status filtering, generated blanket ignore files, and suppression of a real, rotated, expired, or unverified credential are forbidden. Real credentials must be revoked and removed through an explicitly authorized history-remediation process; an ignore annotation is not remediation.
