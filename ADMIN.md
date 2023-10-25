# Admin instructions

## Building images:

```
docker build --target=sqlserver -t ghcr.io/bekk/cloud-labs-demo-todo-sqlserver:latest .
docker build --target=postgres -t ghcr.io/bekk/cloud-labs-demo-todo-postgres:latest .
```

## Pushing images:

### GHCR

Sign in to GHCR locally for pushing:
```
export ghp=<your-github-pat>
echo $ghp | docker login ghcr.io -u <you-github-username> --password-stdin
```

GitHub instructions in detail [here](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

```
docker push ghcr.io/bekk/cloud-labs-demo-todo-sqlserver:latest
docker push ghcr.io/bekk/cloud-labs-demo-todo-postgres:latest
```

### AWS ECR

Currently, `public.ecr.aws/m1p3r7y5` is set up.

```
aws ecr-public get-login-password --region us-east-1 --profile <profile-name> | docker login --username AWS --password-stdin public.ecr.aws/m1p3r7y5
```

```
docker push public.ecr.aws/m1p3r7y5/cloud-labs-demo-todo-sqlserver:latest
docker push public.ecr.aws/m1p3r7y5/cloud-labs-demo-todo-postgres:latest
```

