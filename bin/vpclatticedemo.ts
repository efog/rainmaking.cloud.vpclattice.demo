#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { VpclatticedemoStack } from "../lib/vpclatticedemo-stack";

const app = new cdk.App();
const targetStack = new VpclatticedemoStack(app, "RainmakingCloudVpcLatticeDemo", {
    env: { account: "905418095398", region: "us-east-1" }
});
targetStack.tags.setTag("project", "VpcLatticeDemo");
targetStack.tags.setTag("environment", "Demo");