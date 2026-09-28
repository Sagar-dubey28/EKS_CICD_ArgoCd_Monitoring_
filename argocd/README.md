# Argo CD
Edit `application.yaml` with the real Git repository URL.
Then:
```bash
kubectl apply -f application.yaml
argocd app get eks-devops-demo
```
Automated sync is enabled. Jenkins changes the image tag in Git; Argo CD reconciles the cluster from Git.
