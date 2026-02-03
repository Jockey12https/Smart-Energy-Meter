package ch.opendata.energy.domain.meter;

import ch.opendata.energy.config.ReactiveKafkaConfig;
import ch.opendata.energy.service.FirebaseDataService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.reactive.ReactiveKafkaConsumerTemplate;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Scheduler;
import reactor.core.scheduler.Schedulers;
import reactor.util.retry.Retry;

import java.time.Duration;

//@Component
@Slf4j
public class FirebaseOutputConsumer {
  private final ReactiveKafkaConsumerTemplate<String, MeterUplinkEvent> receiver;
  private final Scheduler scheduler;

  private final FirebaseDataService firebaseDataService;

  public FirebaseOutputConsumer(ReactiveKafkaConfig config, FirebaseDataService firebaseDataService) {
    this.receiver = config.consumer("meter_data", "outputs.firebase", true);
    this.scheduler = Schedulers.newElastic("firebaseProcessor", 10, true);
    this.firebaseDataService = firebaseDataService;

    receiver
      .receive()
      .publishOn(scheduler)
      .concatMap(message -> consume(message.value())
        .thenEmpty(message.receiverOffset().commit())
        .log()
        .retryWhen(Retry.backoff(10, Duration.ofMillis(500))))
      .doOnError(e -> log.error("could not process Firebase output", e))
      .doOnCancel(() -> close())
      .subscribe();
  }

  public void close() {
    scheduler.dispose();
  }

  public Mono<Void> consume(MeterUplinkEvent event) {
    MeterDocument sample = MeterDocument.builder()
      .timestamp(event.getTimestamp())
      .kWh(event.getKWh())
      .meterId(event.getMeterId())
      .build();

    return firebaseDataService.saveData(sample);
  }
}
