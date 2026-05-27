FROM maven:3.9.15-eclipse-temurin-21 AS build

WORKDIR /workspace
COPY pom.xml mvnw ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw -q -DskipTests dependency:go-offline
COPY src src
RUN ./mvnw -q -DskipTests package

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app
COPY --from=build /workspace/target/*.jar /app/telemetry-processor.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/telemetry-processor.jar"]
