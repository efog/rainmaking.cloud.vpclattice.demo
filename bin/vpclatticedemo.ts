#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { VpclatticedemoStack } from "../lib/vpclatticedemo-stack";

const app = new cdk.App();
new VpclatticedemoStack(app, "RainmakingCloudVpcLatticeDemo", {
    env: { account: "905418095398", region: "us-east-1" }
});