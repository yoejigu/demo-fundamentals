import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as random from "@pulumi/random";

// All of these values are injected by the Pulumi ESC environment that is
// attached to the stack (see `environment:` in Pulumi.dev.yaml and esc/demo-fundamentals-dev.yaml).
const config = new pulumi.Config();

const appName = config.require("appName");
const environment = config.require("environment");
const greeting = config.require("greeting");

// Secret values defined with `fn::secret` in ESC stay encrypted in state
// and are masked in CLI and GitHub Actions output.
const apiKey = config.requireSecret("apiKey");

// A resource whose inputs come from ESC config. Changing a value in the ESC
// environment and re-running the workflow produces a diff in `pulumi preview`.
const suffix = new random.RandomPet("suffix", {
    length: 2,
    prefix: appName,
    keepers: {
        environment,
        greeting,
    },
});

// A secret-derived value, to show secrets propagating through resources.
const sessionToken = new random.RandomPassword("session-token", {
    length: 24,
    special: false,
    keepers: {
        // The keeper is derived from a secret, so the resulting value is secret too.
        apiKey,
    },
});

// An S3 bucket created with AWS credentials that ESC obtained via OIDC
// (`fn::open::aws-login`). No AWS keys are stored in GitHub or in this repo.
const bucket = new aws.s3.Bucket("demo-bucket", {
    tags: {
        App: appName,
        Environment: environment,
        ManagedBy: "pulumi-esc-github-actions",
    },
});

new aws.s3.BucketPublicAccessBlock("demo-bucket-public-access", {
    bucket: bucket.id,
    blockPublicAcls: true,
    blockPublicPolicy: true,
    ignorePublicAcls: true,
    restrictPublicBuckets: true,
});

export const bucketName = bucket.id;
export const deploymentName = suffix.id;
export const message = pulumi.interpolate`${greeting} from ${appName} (${environment})`;

// Exported secrets are shown as [secret] in the console and CLI.
export const apiKeyFromEsc = apiKey;
export const generatedSessionToken = sessionToken.result;
