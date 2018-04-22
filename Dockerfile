FROM microsoft/aspnetcore-build-nightly:2.1.300-preview2 AS builder
ENV DOTNET_SDK_VERSION 2.1.300-preview2-008533
ENV DOTNET_SDK_DOWNLOAD_URL https://dotnetcli.blob.core.windows.net/dotnet/Sdk/$DOTNET_SDK_VERSION/dotnet-sdk-$DOTNET_SDK_VERSION-linux-x64.tar.gz

RUN curl -SL $DOTNET_SDK_DOWNLOAD_URL --output dotnet.tar.gz \
	&& rm -rf /usr/share/dotnet \
    && mkdir -p /usr/share/dotnet \
    && tar -zxf dotnet.tar.gz -C /usr/share/dotnet \
    && rm dotnet.tar.gz

WORKDIR /src
COPY . .
RUN npm install && dotnet restore LoFGatekeeper.sln -nowarn:msb3202,nu1503

WORKDIR /src
RUN dotnet publish LoFGatekeeper.csproj -c Release -o /app

FROM microsoft/aspnetcore-nightly:2.1.0-preview2 AS base
RUN apt-get update && apt-get install -y curl apt-transport-https gnupg && \
    curl -sL https://deb.nodesource.com/setup_8.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app
COPY --from=builder /app .
COPY --from=builder /src/Views ./Views

WORKDIR /usr/share/dotnet/shared
COPY --from=builder /usr/share/dotnet/shared .
EXPOSE 80
ENTRYPOINT ["dotnet", "LoFGatekeeper.dll"]