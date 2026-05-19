# Building best practices

## Use multi-stage builds

Multi-stage builds let you reduce the size of your final image, by creating a cleaner separation between the building of your image and the final output. Split your Dockerfile instructions into distinct stages to make sure that the resulting output only contains the files that are needed to run the application.

Using multiple stages can also let you build more efficiently by executing build steps in parallel.

### Create reusable stages

If you have multiple images with a lot in common, consider creating a reusable stage that includes the shared components, and basing your unique stages on that. Docker only needs to build the common stage once. This means that your derivative images use memory on the Docker host more efficiently and load more quickly.

It's also easier to maintain a common base stage ("Don't repeat yourself"), than it is to have multiple different stages doing similar things.

## Choose the right base image

The first step towards achieving a secure image is to choose the right base image. When choosing an image, ensure it's built from a trusted source and keep it small.

- **Docker Official Images** are a curated collection that have clear documentation, promote best practices, and are regularly updated. They provide a trusted starting point for many applications.
- **Verified Publisher** images are high-quality images published and maintained by the organizations partnering with Docker, with Docker verifying the authenticity of the content in their repositories.
- **Docker-Sponsored Open Source** are published and maintained by open source projects sponsored by Docker through an open source program.

When building your own image from a Dockerfile, ensure you choose a minimal base image that matches your requirements. A smaller base image not only offers portability and fast downloads, but also shrinks the size of your image and minimizes the number of vulnerabilities introduced through the dependencies.

You should also consider using two types of base image: one for building and unit testing, and another (typically slimmer) image for production. In the later stages of development, your image may not require build tools such as compilers, build systems, and debugging tools. A small image with minimal dependencies can considerably lower the attack surface.

## Rebuild your images often

Docker images are immutable. Building an image is taking a snapshot of that image at that moment. That includes any base images, libraries, or other software you use in your build. To keep your images up-to-date and secure, rebuild your images regularly with updated dependencies.

### Use --pull to get fresh base images

The following Dockerfile uses the `24.04` tag of the `ubuntu` image. Over time, that tag may resolve to a different underlying version of the `ubuntu` image, as the publisher rebuilds the image with new security patches and updated libraries.

```dockerfile
# syntax=docker/dockerfile:1
FROM ubuntu:24.04
RUN apt-get -y update && apt-get install -y --no-install-recommends python3
```

To get the latest version of the base image, use the `--pull` flag:

```console
$ docker build --pull -t my-image:my-tag .
```

The `--pull` flag forces Docker to check for and download a newer version of the base image, even if you have a version cached locally.

### Use --no-cache for clean builds

The `--no-cache` flag disables the build cache, forcing Docker to rebuild all layers from scratch:

```console
$ docker build --no-cache -t my-image:my-tag .
```

This gets the latest available versions of dependencies from package managers like `apt-get` or `npm`. However, `--no-cache` doesn't pull a fresh base image - it only prevents reusing cached layers. For a completely fresh build with the latest base image, combine both flags:

```console
$ docker build --pull --no-cache -t my-image:my-tag .
```

## Exclude with .dockerignore

To exclude files not relevant to the build, without restructuring your source repository, use a `.dockerignore` file. This file supports exclusion patterns similar to `.gitignore` files.

For example, to exclude all files with the `.md` extension:

```plaintext
*.md
```

## Create ephemeral containers

The image defined by your Dockerfile should generate containers that are as ephemeral as possible. Ephemeral means that the container can be stopped and destroyed, then rebuilt and replaced with an absolute minimum set up and configuration.

Refer to [Processes](https://12factor.net/processes) under _The Twelve-factor App_ methodology to get a feel for the motivations of running containers in such a stateless fashion.

## Don't install unnecessary packages

Avoid installing extra or unnecessary packages just because they might be nice to have. For example, you don't need to include a text editor in a database image.

When you avoid installing extra or unnecessary packages, your images have reduced complexity, reduced dependencies, reduced file sizes, and reduced build times.

## Decouple applications

Each container should have only one concern. Decoupling applications into multiple containers makes it easier to scale horizontally and reuse containers. For instance, a web application stack might consist of three separate containers, each with its own unique image, to manage the web application, database, and an in-memory cache in a decoupled manner.

Limiting each container to one process is a good rule of thumb, but it's not a hard and fast rule. Use your best judgment to keep containers as clean and modular as possible. If containers depend on each other, you can use Docker container networks to ensure that these containers can communicate.

## Sort multi-line arguments

Whenever possible, sort multi-line arguments alphanumerically to make maintenance easier. This helps to avoid duplication of packages and make the list much easier to update. This also makes PRs a lot easier to read and review.

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
  bzr \
  cvs \
  git \
  mercurial \
  subversion \
  && rm -rf /var/lib/apt/lists/*
```

## Leverage build cache

When building an image, Docker steps through the instructions in your Dockerfile, executing each in the order specified. For each instruction, Docker checks whether it can reuse the instruction from the build cache.

Understanding how the build cache works, and how cache invalidation occurs, is critical for ensuring faster builds.

## Pin base image versions

Image tags are mutable, meaning a publisher can update a tag to point to a new image. This is useful because it lets publishers update tags to point to newer versions of an image. And as an image consumer, it means you automatically get the new version when you re-build your image.

For example, if you specify `FROM alpine:3.21` in your Dockerfile, `3.21` resolves to the latest patch version for `3.21`.

```dockerfile
# syntax=docker/dockerfile:1
FROM alpine:3.21
```

At one point in time, the `3.21` tag might point to version 3.21.1 of the image. If you rebuild the image 3 months later, the same tag might point to a different version, such as 3.21.4. This publishing workflow is best practice, and most publishers use this tagging strategy, but it isn't enforced.

The downside with this is that you're not guaranteed to get the same for every build. This could result in breaking changes, and it means you also don't have an audit trail of the exact image versions that you're using.

To fully secure your supply chain integrity, you can pin the image version to a specific digest. By pinning your images to a digest, you're guaranteed to always use the same image version, even if a publisher replaces the tag with a new image. For example, the following Dockerfile pins the Alpine image to the same tag as earlier, `3.21`, but this time with a digest reference as well.

```dockerfile
# syntax=docker/dockerfile:1
FROM alpine:3.21@sha256:a8560b36e8b8210634f77d9f7f9efd7ffa463e380b75e2e74aff4511df3ef88c
```

With this Dockerfile, even if the publisher updates the `3.21` tag, your builds would still use the pinned image version: `a8560b36e8b8210634f77d9f7f9efd7ffa463e380b75e2e74aff4511df3ef88c`.

While this helps you avoid unexpected changes, it's also more tedious to have to look up and include the image digest for base image versions manually each time you want to update it. And you're opting out of automated security fixes, which is likely something you want to get.

## Build and test your images in CI

When you check in a change to source control or create a pull request, use GitHub Actions or another CI/CD pipeline to automatically build and tag a Docker image and test it.

## Dockerfile instructions

Follow these recommendations on how to properly use the Dockerfile instructions to create an efficient and maintainable Dockerfile.

### FROM

Whenever possible, use current official images as the basis for your images. Docker recommends the Alpine image as it is tightly controlled and small in size (under 6 MB), while still being a full Linux distribution.

### LABEL

You can add labels to your image to help organize images by project, record licensing information, to aid in automation, or for other reasons. For each label, add a line beginning with `LABEL` with one or more key-value pairs.

```dockerfile
# Set one or more individual labels
LABEL com.example.version="0.0.1-beta"
LABEL vendor1="ACME Incorporated"
LABEL vendor2=ZENITH\ Incorporated
LABEL com.example.release-date="2015-02-12"
LABEL com.example.version.is-production=""
```

### RUN

Split long or complex `RUN` statements on multiple lines separated with backslashes to make your Dockerfile more readable, understandable, and maintainable.

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    package-bar \
    package-baz \
    package-foo
```

You can also use here documents to run multiple commands without chaining them with a pipeline operator:

```dockerfile
RUN <<EOF
apt-get update
apt-get install -y --no-install-recommends \
    package-bar \
    package-baz \
    package-foo
EOF
```

#### apt-get

One common use case for `RUN` instructions in Debian-based images is to install software using `apt-get`. Because `apt-get` installs packages, the `RUN apt-get` command has several counter-intuitive behaviors to look out for.

Always combine `RUN apt-get update` with `apt-get install` in the same `RUN` statement. For example:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    package-bar \
    package-baz \
    package-foo
```

Using `apt-get update` alone in a `RUN` statement causes caching issues and subsequent `apt-get install` instructions to fail. This is known as cache busting.

In addition, when you clean up the apt cache by removing `/var/lib/apt/lists` it reduces the image size, since the apt cache isn't stored in a layer.

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    aufs-tools \
    automake \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*
```

#### Using pipes

Some `RUN` commands depend on the ability to pipe the output of one command into another, using the pipe character (`|`):

```dockerfile
RUN wget -O - https://some.site | wc -l > /number
```

Docker executes these commands using the `/bin/sh -c` interpreter, which only evaluates the exit code of the last operation in the pipe to determine success. To fail the build on errors at any stage in the pipe, prepend `set -o pipefail &&`:

```dockerfile
RUN set -o pipefail && wget -O - https://some.site | wc -l > /number
```

### CMD

The `CMD` instruction should be used to run the software contained in your image, along with any arguments. `CMD` should almost always be used in the form of `CMD ["executable", "param1", "param2"]`. Thus, if the image is for a service, such as Apache and Rails, you would run something like `CMD ["apache2","-DFOREGROUND"]`. Indeed, this form of the instruction is recommended for any service-based image.

### EXPOSE

The `EXPOSE` instruction indicates the ports on which a container listens for connections. Consequently, you should use the common, traditional port for your application. For example, an image containing the Apache web server would use `EXPOSE 80`, while an image containing MongoDB would use `EXPOSE 27017` and so on.

### ENV

To make new software easier to run, you can use `ENV` to update the `PATH` environment variable for the software your container installs. For example, `ENV PATH=/usr/local/nginx/bin:$PATH` ensures that `CMD ["nginx"]` just works.

Each `ENV` line creates a new intermediate layer, just like `RUN` commands. This means that even if you unset the environment variable in a future layer, it still persists in this layer and its value can be dumped.

To prevent this and unset the environment variable, use a `RUN` command with shell commands, to set, use, and unset the variable all in a single layer:

```dockerfile
FROM alpine
RUN export ADMIN_USER="mark" \
    && echo $ADMIN_USER > ./mark \
    && unset ADMIN_USER
CMD sh
```

### ADD or COPY

`ADD` and `COPY` are functionally similar. `COPY` supports basic copying of files into the container, from the build context or from a stage in a multi-stage build. `ADD` supports features for fetching files from remote HTTPS and Git URLs, and extracting tar files automatically when adding files from the build context.

You'll mostly want to use `COPY` for copying files from one stage to another in a multi-stage build. If you need to add files from the build context to the container temporarily to execute a `RUN` instruction, you can often substitute the `COPY` instruction with a bind mount instead. For example:

```dockerfile
RUN --mount=type=bind,source=requirements.txt,target=/tmp/requirements.txt \
    pip install --requirement /tmp/requirements.txt
```

Bind mounts are more efficient than `COPY` for including files from the build context in the container.

The `ADD` instruction is best for when you need to download a remote artifact as part of your build. `ADD` also has built-in support for checksum validation of the remote resources, and a protocol for parsing branches, tags, and subdirectories from Git URLs.

### ENTRYPOINT

The best use for `ENTRYPOINT` is to set the image's main command, allowing that image to be run as though it was that command, and then use `CMD` as the default flags.

```dockerfile
ENTRYPOINT ["s3cmd"]
CMD ["--help"]
```

The `ENTRYPOINT` instruction can also be used in combination with a helper script. Use the `exec` builtin so that the final running application becomes the container's PID 1. This allows the application to receive any Unix signals sent to the container.

```bash
#!/bin/sh
set -e

if [ "$1" = 'postgres' ]; then
    chown -R postgres "$PGDATA"

    if [ -z "$(ls -A "$PGDATA")" ]; then
        gosu postgres initdb
    fi

    exec gosu postgres "$@"
fi

exec "$@"
```

### VOLUME

You should use the `VOLUME` instruction to expose any database storage area, configuration storage, or files and folders created by your Docker container. You are strongly encouraged to use `VOLUME` for any combination of mutable or user-serviceable parts of your image.

### USER

If a service can run without privileges, use `USER` to change to a non-root user. Start by creating the user and group in the Dockerfile with something like the following example:

```dockerfile
RUN groupadd -r postgres && useradd --no-log-init -r -g postgres postgres
```

> **NOTE — Consider an explicit UID/GID.** Users and groups in an image are assigned a non-deterministic UID/GID in that the "next" UID/GID is assigned regardless of image rebuilds. So, if it's critical, you should assign an explicit UID/GID.

Avoid installing or using `sudo` as it has unpredictable TTY and signal-forwarding behavior that can cause problems.

Lastly, to reduce layers and complexity, avoid switching `USER` back and forth frequently.

### WORKDIR

For clarity and reliability, you should always use absolute paths for your `WORKDIR`. Also, you should use `WORKDIR` instead of proliferating instructions like `RUN cd … && do-something`, which are hard to read, troubleshoot, and maintain.

### ONBUILD

An `ONBUILD` command executes after the current Dockerfile build completes. `ONBUILD` executes in any child image derived `FROM` the current image. Think of the `ONBUILD` command as an instruction that the parent Dockerfile gives to the child Dockerfile.

`ONBUILD` is useful for images that are going to be built `FROM` a given image. Images built with `ONBUILD` should get a separate tag.
