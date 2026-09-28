# CloudWatch

Use the Amazon CloudWatch Observability EKS add-on. Ensure its IAM permissions are configured before installation.

```bash
./install.sh devops-assignment ap-south-1
kubectl get pods -n amazon-cloudwatch
```

Verify EKS logs and Container Insights metrics in CloudWatch.
