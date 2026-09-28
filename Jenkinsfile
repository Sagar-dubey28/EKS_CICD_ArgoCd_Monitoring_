pipeline {
    agent any
    environment {
        AWS_REGION = 'ap-south-1'
        ECR_REPOSITORY = 'eks-devops-demo'
        IMAGE_TAG = "${BUILD_NUMBER}-${GIT_COMMIT.take(7)}"
    }
    stages {
        stage('Checkout') {
            steps { checkout scm }
        }
        stage('Build') {
            steps { dir('app') { sh 'npm ci --ignore-scripts' } }
        }
        stage('Test') {
            steps { dir('app') { sh 'npm test' } }
        }
        stage('Docker Image Build') {
            steps {
                sh '''
                  docker build -t ${ECR_REPOSITORY}:${IMAGE_TAG} app
                '''
            }
        }
        stage('Push Image to ECR') {
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                  credentialsId: 'aws-jenkins',
                  accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                  secretKeyVariable: 'AWS_SECRET_ACCESS_KEY']]) {
                    sh '''
                      ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
                      ECR_REGISTRY=${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                      aws ecr describe-repositories --repository-names ${ECR_REPOSITORY} --region ${AWS_REGION} >/dev/null 2>&1 ||                         aws ecr create-repository --repository-name ${ECR_REPOSITORY} --region ${AWS_REGION}
                      aws ecr get-login-password --region ${AWS_REGION} |                         docker login --username AWS --password-stdin ${ECR_REGISTRY}
                      docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}
                      docker push ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}
                    '''
                }
            }
        }
        stage('Update GitOps Manifest') {
            steps {
                withCredentials([gitUsernamePassword(credentialsId: 'github-https', gitToolName: 'Default')]) {
                    sh '''
                      ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
                      IMAGE="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}"
                      sed -i "s|image: .*|image: ${IMAGE}|" k8s/deployment.yaml
                      git config user.email "jenkins@local"
                      git config user.name "jenkins"
                      git add k8s/deployment.yaml
                      git commit -m "chore: deploy ${IMAGE_TAG}" || true
                      git push origin HEAD:main
                    '''
                }
            }
        }
    }
    post {
        always {
            sh 'docker image prune -f || true'
        }
    }
}
