FROM microsoft/dotnet:2.1.300-rc1-sdk AS builder

# ENV DOTNET_SDK_VERSION 2.1.300-rc1-008673
# ENV DOTNET_SDK_DOWNLOAD_URL https://dotnetcli.blob.core.windows.net/dotnet/Sdk/$DOTNET_SDK_VERSION/dotnet-sdk-$DOTNET_SDK_VERSION-linux-x64.tar.gz

# RUN curl -SL $DOTNET_SDK_DOWNLOAD_URL --output dotnet.tar.gz \
# 	&& rm -rf /usr/share/dotnet \
#    && mkdir -p /usr/share/dotnet \
#    && tar -zxf dotnet.tar.gz -C /usr/share/dotnet \
#    && rm dotnet.tar.gz

WORKDIR /src
COPY . .

ENV NODE_VERSION 10.2.0
ENV NODE_DOWNLOAD_SHA 75195a61d029819ad9ce77cbb13d3a29362c07cf73f2dc52da8a3f14839554cb
RUN curl -SL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz" --output nodejs.tar.gz \
    && echo "$NODE_DOWNLOAD_SHA nodejs.tar.gz" | sha256sum -c - \
    && tar -xzf "nodejs.tar.gz" -C /usr/local --strip-components=1 \
    && ln -s /usr/local/bin/node /usr/local/bin/nodejs \
    && npm i npm@latest -g

RUN npm install && dotnet restore LoFGatekeeper.sln -nowarn:msb3202,nu1503
RUN dotnet publish LoFGatekeeper.csproj -c Release -o /app

FROM microsoft/dotnet:2.1.0-rc1-aspnetcore-runtime AS base

WORKDIR /app
COPY --from=builder /app .
COPY --from=builder /src/Views ./Views

WORKDIR /usr/share/dotnet/shared
COPY --from=builder /usr/share/dotnet/shared .
COPY --from=builder /src/nodejs.tar.gz .
RUN tar -xzf "nodejs.tar.gz" -C /usr/local --strip-components=1 \
    && rm nodejs.tar.gz \
    && ln -s /usr/local/bin/node /usr/local/bin/nodejs \
    && npm i npm@latest -g

EXPOSE 80
ENTRYPOINT ["dotnet", "LoFGatekeeper.dll"]