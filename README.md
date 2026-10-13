# demo-fundamentals

A small Pulumi (TypeScript) program that demonstrates Pulumi ESC with GitHub Actions.

The program reads config and a secret that are injected by an ESC environment
(`demo/demo-fundamentals/dev`), creates two `random` resources, and creates a private
S3 bucket in AWS. No AWS keys are stored in GitHub: the ESC environment imports
`cloud-access/aws-oidc`, which assumes an IAM role through OIDC.

## How the integration works

1. GitHub Actions requests an OIDC token (`id-token: write`).
2. `pulumi/auth-actions` exchanges it for a short-lived Pulumi Cloud token. No stored `PULUMI_ACCESS_TOKEN`.
3. `pulumi/esc-action` opens the ESC environment, which uses `fn::open::aws-login` (OIDC) to get short-lived AWS credentials, and exports `values.environmentVariables` (including `AWS_*`) into the job. The workflow verifies this with `aws sts get-caller-identity`.
4. `pulumi/actions` runs `preview` (PRs) or `up` (main). The environment is attached to the stack in `Pulumi.dev.yaml`, so `values.pulumiConfig` becomes stack config and `fn::secret` values stay encrypted.

## Setup

1. Create the ESC environment:

   ```bash
   pulumi env init demo/demo-fundamentals/dev
   pulumi env edit --file esc/demo-fundamentals-dev.yaml demo/demo-fundamentals/dev
   pulumi env set demo/demo-fundamentals/dev apiKey "<your-demo-key>" --secret
   ```

2. Create the stack:

   ```bash
   npm install
   pulumi stack init demo/demo-fundamentals/dev
   ```

3. In Pulumi Cloud, register GitHub as an OIDC issuer (Settings > Access management > OIDC issuers)
   for this repository, and grant it access to the `demo` organization.
   See https://www.pulumi.com/docs/pulumi-cloud/access-management/oidc-client/github/

4. Push to GitHub. Open a PR to see `preview` run; merge to `main` to run `up`.

## Demo talking points

- Edit `greeting` in the ESC environment, re-run the workflow, and watch the stack diff change with no code or workflow edits.
- The `Verify AWS identity` step shows the assumed IAM role session, with no static AWS credentials anywhere.
- Secrets (`apiKey`) are masked in Actions logs and shown as `[secret]` in outputs.
- Environment versions and audit history are tracked in Pulumi ESC.
