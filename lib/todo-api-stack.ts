import {
  Stack,
  StackProps,
  RemovalPolicy,
  CfnOutput,
  Duration,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as path from "path";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { RetentionDays } from "aws-cdk-lib/aws-logs";

export class TodoApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // DynamoDB
    const table = new dynamodb.Table(this, "TodosTable", {
      tableName: "Todos",
      partitionKey: { name: "todoId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY, // 学習用途: 本番ではRETAIN推奨
    });

    // API Gateway (REST)
    const api = new apigw.RestApi(this, "TodoApi", {
      restApiName: "TodoApi",
      defaultCorsPreflightOptions: {
        allowOrigins: ["http://localhost:3000"],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    // Cognito User Pool
    // APIを利用できるユーザーのアカウント情報を管理する認証基盤を作成
    // イメージRDSのusersテーブルの上位互換
    // パスワード管理、ハッシュ化、JWT発効まで自動
    const userPool = new cognito.UserPool(this, "TodoUserPool", {
      userPoolName: "TodoUserPool", // ユーザープール名
      selfSignUpEnabled: true, // ユーザー自身でサインアップできるようにする
      signInAliases: { email: true }, // メールアドレスでログインできるようにする
      passwordPolicy: {
        // パスワードポリシーの設定
        minLength: 8, // 最低8文字
        requireLowercase: true, // 小文字を必須
        requireUppercase: true, // 大文字を必須
        requireDigits: true, // 数字を必須
        requireSymbols: false, // 記号は必須ではない
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY, // アカウント回復方法をメールのみに設定
    });

    // App Client (クライアント側ログイン用)
    const userPoolClient = userPool.addClient("TodoUserPoolClient", {
      userPoolClientName: "TodoUserPoolClient", // クライアント名
      authFlows: {
        // 認証フローの設定
        userPassword: true, // パスワード認証を有効化
        userSrp: true, // SRP認証を有効化
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true, // 認可コードグラントフローを有効化
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ], // OpenID Connectとメールスコープを指定
        callbackUrls: ["http://localhost:3000/auth/callback"], // 認証後のリダイレクトURL（フロントエンドのURLを指定）
        logoutUrls: ["http://localhost:3000/"], // ログアウト後のリダイレクトURL（フロントエンドのURLを指定）
      },
      accessTokenValidity: Duration.minutes(60), // アクセストークンの有効期限を60分に設定
      idTokenValidity: Duration.minutes(60), // IDトークンの有効期限を60分に設定
    });

    // Domain (Cognitoが提供するホストドメインを使用してユーザープールにドメインを設定)
    const domainPrefix = "todo-hosted-ui"; // ドメインプレフィックスをアカウントIDとリージョンを組み合わせて一意にする
    userPool.addDomain("TodoHostedDomain", {
      cognitoDomain: { domainPrefix }, // Cognitoが提供するホストドメインを使用
    });

    // Groups (ユーザーのグループ分け、例: 管理者と一般ユーザー)
    new cognito.CfnUserPoolGroup(this, "AdminGroup", {
      // 管理者グループ
      userPoolId: userPool.userPoolId, // ユーザープールIDを指定
      groupName: "Admin", // 管理者グループ
    });

    new cognito.CfnUserPoolGroup(this, "UserGroup", {
      // 一般ユーザーグループ
      userPoolId: userPool.userPoolId, // ユーザープールIDを指定
      groupName: "User", // 一般ユーザーグループ
    });

    // Authorizer (API GatewayでCognitoを認証に使用するための設定)
    const authorizer = new apigw.CognitoUserPoolsAuthorizer(
      this,
      "TodoAuthorizer",
      {
        cognitoUserPools: [userPool], // 認証に使用するユーザープールを指定
        identitySource: "method.request.header.Authorization", // 認証情報が含まれるリクエストヘッダーを指定
      },
    );

    new CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
    });

    const todos = api.root.addResource("todos");
    const todoById = todos.addResource("{todoId}");

    const projectRoot = path.resolve(__dirname, "..", "..");

    // Lambda 共通設定
    const mkFn = (id: string, entry: string) => {
      const fn = new NodejsFunction(this, id, {
        runtime: Runtime.NODEJS_20_X,
        entry: path.join(projectRoot, "lambdas", "src", "handlers", entry),
        handler: "handler",
        logRetention: RetentionDays.ONE_WEEK,
        environment: {
          TABLE_NAME: table.tableName,
        },
        bundling: {
          // aws-sdk は Lambda ランタイムに同梱されていないので、バンドルに含める（デフォルト）
          minify: true,
          sourceMap: true,
          target: "es2022",
          forceDockerBundling: false,
        },
      });
      table.grantReadWriteData(fn);
      return fn;
    };

    const createTodo = mkFn("CreateTodoFn", "createTodo.ts");
    const listTodos = mkFn("ListTodosFn", "listTodos.ts");
    const getTodo = mkFn("GetTodoFn", "getTodo.ts");
    const updateTodo = mkFn("UpdateTodoFn", "updateTodo.ts");
    const deleteTodo = mkFn("DeleteTodoFn", "deleteTodo.ts");

    // API GatewayのルートとLambda関数を紐付ける
    // 登録API
    todos.addMethod("POST", new apigw.LambdaIntegration(createTodo), {
      authorizationType: apigw.AuthorizationType.COGNITO, // 認証タイプをCognitoに設定
      authorizer, // 先ほど作成したCognitoオーソライザーを指定
    });

    // 一覧API（認証付き）
    todos.addMethod("GET", new apigw.LambdaIntegration(listTodos), {
      authorizationType: apigw.AuthorizationType.COGNITO, // 認証タイプをCognitoに設定
      authorizer, // 先ほど作成したCognitoオーソライザーを指定
    });

    // 詳細API（認証付き）
    todoById.addMethod("GET", new apigw.LambdaIntegration(getTodo), {
      authorizationType: apigw.AuthorizationType.COGNITO, // 認証タイプをCognitoに設定
      authorizer, // 先ほど作成したCognitoオーソライザーを指定
    });

    // 更新API（認証付き）
    todoById.addMethod("PUT", new apigw.LambdaIntegration(updateTodo), {
      authorizationType: apigw.AuthorizationType.COGNITO, // 認証タイプをCognitoに設定
      authorizer, // 先ほど作成したCognitoオーソライザーを指定
    });

    // 削除API（認証付き）
    todoById.addMethod("DELETE", new apigw.LambdaIntegration(deleteTodo), {
      authorizationType: apigw.AuthorizationType.COGNITO, // 認証タイプをCognitoに設定
      authorizer, // 先ほど作成したCognitoオーソライザーを指定
    });

    new CfnOutput(this, "ApiUrl", { value: api.url });
    new CfnOutput(this, "CognitoUserPoolId", { value: userPool.userPoolId });
    new CfnOutput(this, "CognitoUserPoolClientId", {
      value: userPoolClient.userPoolClientId,
    });
    new CfnOutput(this, "CognitoHostedDomainUrl", {
      value: `https://${domainPrefix}.auth.${this.region}.amazoncognito.com`,
    });
    new CfnOutput(this, "TableName", { value: table.tableName });

    // API GatewayのレスポンスにCORSヘッダーを追加（認証エラーなども含む全てのレスポンスに対してCORSを許可する）
    // 4XXエラーのレスポンスにCORSヘッダーを追加
    api.addGatewayResponse("Default4xx", {
      type: apigw.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        "Access-Control-Allow-Origin": "'http://localhost:3000'",
        "Access-Control-Allow-Headers": "'Content-Type,Authorization'",
        "Access-Control-Allow-Methods": "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });

    // API GatewayのレスポンスにCORSヘッダーを追加（認証エラーなども含む全てのレスポンスに対してCORSを許可する）
    // 認証エラーなども含む全てのレスポンスに対してCORSを許可するため、4xxと5xxの両方に同様のレスポンスを追加
    api.addGatewayResponse("Default5xx", {
      type: apigw.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        "Access-Control-Allow-Origin": "'http://localhost:3000'",
        "Access-Control-Allow-Headers": "'Content-Type,Authorization'",
        "Access-Control-Allow-Methods": "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });
  }
}
