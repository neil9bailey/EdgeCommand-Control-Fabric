@description('Azure region for the EdgeCommand Control Fabric foundation.')
param location string = resourceGroup().location

@description('Short environment name, for example dev, test, prod.')
param environmentName string = 'dev'

@description('Container image for the API gateway. Replace during CI/CD promotion.')
param apiImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Container image for the web console. Replace during CI/CD promotion.')
param webImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Existing shared Key Vault URL, for example the DIIaC vault URL. Leave empty for local/dev placeholder deployments.')
param sharedKeyVaultUrl string = ''

@description('Secret-name mapping used by the API gateway Key Vault loader.')
param keyVaultSecretNames object = {
  ENTRA_TENANT_ID: 'edgecommand-entra-tenant-id'
  ENTRA_EXPECTED_AUDIENCE: 'edgecommand-entra-expected-audience'
  ENTRA_EXPECTED_ISSUERS: 'edgecommand-entra-expected-issuers'
  ENTRA_GROUP_TO_ROLE_JSON: 'edgecommand-entra-group-to-role-json'
  ENTRA_PRINCIPAL_TO_ROLE_JSON: 'edgecommand-entra-principal-to-role-json'
  EDGECOMMAND_INTERNAL_API_TOKEN: 'edgecommand-internal-api-token'
  OPENAI_API_KEY: 'edgecommand-openai-api-key'
  AZURE_OPENAI_API_KEY: 'edgecommand-azure-openai-api-key'
  AZURE_OPENAI_ENDPOINT: 'edgecommand-azure-openai-endpoint'
  ANTHROPIC_API_KEY: 'edgecommand-anthropic-api-key'
  GITHUB_TOKEN: 'edgecommand-github-token'
  POSTMAN_API_KEY: 'edgecommand-postman-api-key'
  HOME_ASSISTANT_TOKEN: 'edgecommand-home-assistant-token'
  MQTT_USERNAME: 'edgecommand-mqtt-username'
  MQTT_PASSWORD: 'edgecommand-mqtt-password'
}

var prefix = 'edgecommand-${environmentName}'
var sharedKeyVaultEnabled = !empty(sharedKeyVaultUrl)

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${prefix}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource containerEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${prefix}-aca'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: replace('${prefix}-kv', '-', '')
  location: location
  properties: {
    tenantId: tenant().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enabledForDeployment: false
    enabledForTemplateDeployment: false
    enabledForDiskEncryption: false
  }
}

resource apiApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${prefix}-api'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3101
        transport: 'auto'
        allowInsecure: false
      }
    }
    template: {
      containers: [
        {
          name: 'api-gateway'
          image: apiImage
          env: [
            {
              name: 'AUTH_MODE'
              value: sharedKeyVaultEnabled ? 'entra_jwt_rs256' : 'development'
            }
            {
              name: 'API_GATEWAY_PORT'
              value: '3101'
            }
            {
              name: 'AZURE_KEY_VAULT_URL'
              value: sharedKeyVaultUrl
            }
            {
              name: 'AZURE_KEY_VAULT_REQUIRED'
              value: sharedKeyVaultEnabled ? 'true' : 'false'
            }
            {
              name: 'AZURE_KEY_VAULT_REQUIRED_SECRET_ENV_NAMES'
              value: sharedKeyVaultEnabled ? 'ENTRA_TENANT_ID,ENTRA_EXPECTED_AUDIENCE' : ''
            }
            {
              name: 'AZURE_KEY_VAULT_SECRET_NAMES_JSON'
              value: string(keyVaultSecretNames)
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 5
      }
    }
  }
}

resource webApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${prefix}-web'
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 5174
        transport: 'auto'
        allowInsecure: false
      }
    }
    template: {
      containers: [
        {
          name: 'web-console'
          image: webImage
          env: [
            {
              name: 'VITE_API_BASE'
              value: 'https://${apiApp.properties.configuration.ingress.fqdn}'
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 5
      }
    }
  }
}

output apiUrl string = 'https://${apiApp.properties.configuration.ingress.fqdn}'
output webUrl string = 'https://${webApp.properties.configuration.ingress.fqdn}'
output keyVaultName string = keyVault.name
output sharedKeyVaultConfigured bool = sharedKeyVaultEnabled
output apiManagedIdentityPrincipalId string = apiApp.identity.principalId
