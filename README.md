# AWS EKS CI/CD and Monitoring Task

This repo implements:
GitHub -> Jenkins CI -> Docker -> Amazon ECR -> GitOps manifest update -> Argo CD -> EKS
and monitoring with Prometheus, Grafana and CloudWatch.

## Structure
- app/ : Node.js app, tests, Dockerfile
- k8s/ : Namespace, Deployment, Service, ServiceMonitor, PrometheusRule
- Jenkinsfile : Checkout, Build, Test, Docker Build, ECR Push, GitOps update
- argocd/ : Argo CD Application
- monitoring/ : Prometheus/Grafana configuration and dashboard
- cloudwatch/ : CloudWatch Observability add-on setup
- infra/ : eksctl EKS cluster configuration

## Runbook

### 1. Create EKS
Review `infra/eksctl-cluster.yaml`, then:
```bash
eksctl create cluster -f infra/eksctl-cluster.yaml
aws eks update-kubeconfig --region ap-south-1 --name devops-assignment
kubectl get nodes
```

### 2. Install Prometheus and Grafana
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
kubectl create namespace monitoring
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack   --namespace monitoring -f monitoring/values.yaml
kubectl get pods -n monitoring
```

### 3. Jenkins
Create Jenkins credentials:
- `aws-jenkins`: AWS credential with least-privilege ECR/STS access.
- `github-https`: Git credential/token for pushing the GitOps manifest.

The Jenkins agent needs AWS CLI, Docker, Node/npm and Git.

Pipeline stages:
Checkout -> Build -> Test -> Docker Image Build -> Push Image to ECR -> Update GitOps Manifest.

The final stage commits the immutable image tag into `k8s/deployment.yaml`.

### 4. Argo CD
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```
Edit `argocd/application.yaml` with your Git repository URL, then:
```bash
kubectl apply -f argocd/application.yaml
kubectl -n argocd get applications
```
For a private repository, configure repository credentials in Argo CD.

### 5. First application deployment
After Jenkins has pushed the first image, the image in `k8s/deployment.yaml` will be valid. Argo CD can then sync it.
```bash
kubectl -n devops-demo get pods
kubectl -n devops-demo get svc
```

### 6. Prometheus
The application exposes `/metrics`. The ServiceMonitor scrapes it every 15 seconds.
Useful PromQL:
```promql
up{namespace="devops-demo"}
rate(http_requests_total[5m])
kube_pod_container_status_restarts_total{namespace="devops-demo"}
```
Prometheus alerts included:
- CPU > 80% of requested CPU for 5 minutes
- CrashLoopBackOff

### 7. Grafana
The dashboard covers:
- pod count
- ready pods
- CPU
- memory
- pod restarts
- node CPU

Port-forward:
```bash
kubectl -n monitoring port-forward svc/kube-prometheus-stack-grafana 3000:80
```
Configure one Grafana alert from the CPU panel with threshold >80% for 5 minutes. Do not commit a real Grafana password.

### 8. CloudWatch
```bash
chmod +x cloudwatch/install.sh
./cloudwatch/install.sh devops-assignment ap-south-1
kubectl get pods -n amazon-cloudwatch
```
Then verify EKS logs and Container Insights metrics in CloudWatch. Ensure the add-on has the required IAM permissions.

## Troubleshooting evidence

### CrashLoopBackOff
```bash
kubectl -n devops-demo get pods
kubectl -n devops-demo describe pod <pod>
kubectl -n devops-demo logs <pod> --previous
kubectl -n devops-demo get events --sort-by=.lastTimestamp
```

### Argo CD OutOfSync
```bash
argocd app get eks-devops-demo
argocd app diff eks-devops-demo
kubectl -n argocd get application eks-devops-demo -o yaml
```
Check repo URL, branch, path, credentials, YAML validity and manual cluster drift.

### Jenkins failure
```bash
aws sts get-caller-identity
aws ecr describe-repositories --repository-names eks-devops-demo
docker info
git remote -v
```
Never print credentials in logs.

### Connectivity
```bash
kubectl -n devops-demo get svc
kubectl -n devops-demo get endpoints
kubectl -n devops-demo describe svc eks-devops-demo
kubectl -n devops-demo get pods -o wide
kubectl -n devops-demo run curl-test --rm -it --image=curlimages/curl -- curl -sS http://eks-devops-demo/health
```

## Completion checklist
- [ ] EKS + namespace
- [ ] Deployment + Service + replicas/resources
- [ ] Dockerfile + ECR image
- [ ] Jenkins CI stages
- [ ] Secure Jenkins AWS credentials
- [ ] Argo CD + automated GitOps sync
- [ ] Prometheus + node/pod monitoring + alert
- [ ] Grafana + dashboard + alert
- [ ] CloudWatch
- [ ] Four troubleshooting scenarios demonstrated
