#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { VpclatticedemoStack } from "../lib/vpclatticedemo-stack";
import { configDotenv } from "dotenv";

configDotenv({});

const app = new cdk.App();
const targetStack = new VpclatticedemoStack(app, "RainmakingCloudVpcLatticeDemo", {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION}
});
targetStack.tags.setTag("project", process.env.CDK_CONFIG_TAG_PROJECT || "");
targetStack.tags.setTag("environment", process.env.CDK_CONFIG_TAG_ENVIRONMENT || "");
targetStack.tags.setTag("awsApplication", process.env.CDK_CONFIG_TAG_AWSAPPLICATION || "");