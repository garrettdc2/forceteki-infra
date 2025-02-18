#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BackendStack } from '../lib/backend-stack';
import { DynamoDbStack } from '../lib/dynamo-db-stack';

const app = new cdk.App();
const env = { account: '182399701650', region: 'us-east-1' }
const stackProps = { env }

new BackendStack(app, 'ForcetekiInfraStack', stackProps);
new DynamoDbStack(app, 'ForcetekiDynamoDbStack', stackProps)
