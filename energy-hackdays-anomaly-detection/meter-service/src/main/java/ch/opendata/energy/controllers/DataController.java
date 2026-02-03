package ch.opendata.energy.controllers;

import ch.opendata.energy.domain.meter.DataQuery;
import ch.opendata.energy.domain.meter.MeterDocument;
import ch.opendata.energy.service.FirebaseDataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import ch.opendata.energy.domain.meter.MeterUplinkEvent;
import ch.opendata.energy.domain.meter.AnomalyDocument;
import ch.opendata.energy.domain.meter.AnomalyDetector;
import java.util.List;

import javax.validation.Valid;

@CrossOrigin
@RestController
@RequestMapping("/api/v1")
public class DataController {
  
  @Autowired
  private FirebaseDataService firebaseDataService;

  @Autowired
  private AnomalyDetector anomalyDetector;

  @GetMapping("/meters")
  public Mono<java.util.List<String>> getMeters() {
    return firebaseDataService.getUsers();
  }

  @PostMapping("/data")
  public Flux<MeterDocument> getData(@RequestBody @Valid DataQuery query) {
    return firebaseDataService.getData(query.getMeterId(), query.getFrom(), query.getTo());
  }

  @PostMapping("/anomalies")
  public Flux<AnomalyDocument> getAnomalies(@RequestBody @Valid DataQuery query) {
    return firebaseDataService.getAnomalies(query.getMeterId(), query.getFrom(), query.getTo());
  }

  @PostMapping("/simulate")
  public Mono<List<AnomalyDocument>> simulate(@RequestBody @Valid MeterUplinkEvent event) {
    return anomalyDetector.consume(event)
      .flatMap(anomalies -> {
        // Save raw data to Firebase
        MeterDocument doc = MeterDocument.builder()
          .meterId(event.getMeterId())
          .timestamp(event.getTimestamp())
          .kWh(event.getKWh())
          .build();
        return firebaseDataService.saveData(doc)
          .then(Mono.defer(() -> {
            // Save anomalies if any
            for (AnomalyDocument anomaly : anomalies) {
              firebaseDataService.saveAnomaly(anomaly);
            }
            return Mono.just(anomalies);
          }));
      });
  }

  @PostMapping("/forecast")
  public Flux<MeterDocument> getForecast(@RequestBody @Valid DataQuery query) {
    return Flux.empty();
  }

}
