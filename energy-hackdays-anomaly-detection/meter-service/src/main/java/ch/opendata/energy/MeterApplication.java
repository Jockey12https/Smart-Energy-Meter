package ch.opendata.energy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.repository.config.EnableReactiveMongoRepositories;

@SpringBootApplication(exclude = {
  org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration.class,
  org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration.class,
  org.springframework.boot.autoconfigure.data.mongo.MongoReactiveDataAutoConfiguration.class,
  org.springframework.boot.autoconfigure.data.mongo.MongoReactiveRepositoriesAutoConfiguration.class
})
public class MeterApplication {

  public static void main(String[] args) {
    SpringApplication.run(MeterApplication.class, args);
  }
}
