package ch.opendata.energy.service;

import ch.opendata.energy.domain.meter.AnomalyDocument;
import ch.opendata.energy.domain.meter.MeterDocument;
import com.google.firebase.database.*;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class FirebaseDataService {

    private final FirebaseDatabase database;
    private static final DateTimeFormatter TIMESTAMP_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd_HH:mm:ss_SSS")
            .withZone(ZoneId.of("UTC"));

    public FirebaseDataService(FirebaseDatabase database) {
        this.database = database;
    }

    public Flux<MeterDocument> getData(String meterId, Date from, Date to) {
        return Flux.create(sink -> {
            DatabaseReference ref = database.getReference("SmartMeter/users").child(meterId).child("data");

            String fromStr = TIMESTAMP_FORMATTER.format(from.toInstant());
            String toStr = TIMESTAMP_FORMATTER.format(to.toInstant());

            Query query = ref.orderByKey().startAt(fromStr).endAt(toStr);

            query.addListenerForSingleValueEvent(new ValueEventListener() {
                @Override
                public void onDataChange(DataSnapshot snapshot) {
                    for (DataSnapshot child : snapshot.getChildren()) {
                        Map<String, Object> val = (Map<String, Object>) child.getValue();
                        String timestamp = child.getKey();
                        MeterDocument doc = MeterDocument.builder()
                                .meterId(meterId)
                                .timestamp(Instant.from(TIMESTAMP_FORMATTER.parse(timestamp)))
                                .kWh(parseDouble(val.get("kWh")))
                                .build();
                        sink.next(doc);
                    }
                    sink.complete();
                }

                @Override
                public void onCancelled(DatabaseError error) {
                    sink.error(error.toException());
                }
            });
        });
    }

    public Flux<AnomalyDocument> getAnomalies(String meterId, Date from, Date to) {
        return Flux.create(sink -> {
            DatabaseReference ref = database.getReference("SmartMeter/users").child(meterId).child("anomalies");

            String fromStr = TIMESTAMP_FORMATTER.format(from.toInstant());
            String toStr = TIMESTAMP_FORMATTER.format(to.toInstant());

            Query query = ref.orderByKey().startAt(fromStr).endAt(toStr);

            query.addListenerForSingleValueEvent(new ValueEventListener() {
                @Override
                public void onDataChange(DataSnapshot snapshot) {
                    for (DataSnapshot child : snapshot.getChildren()) {
                        AnomalyDocument doc = child.getValue(AnomalyDocument.class);
                        sink.next(doc);
                    }
                    sink.complete();
                }

                @Override
                public void onCancelled(DatabaseError error) {
                    sink.error(error.toException());
                }
            });
        });
    }

    public Mono<List<String>> getUsers() {
        return Mono.create(sink -> {
            log.info("Fetching users from Firebase...");
            database.getReference("SmartMeter/users").addListenerForSingleValueEvent(new ValueEventListener() {
                @Override
                public void onDataChange(DataSnapshot snapshot) {
                    log.info("Users data fetched, count: {}", snapshot.getChildrenCount());
                    List<String> users = new ArrayList<>();
                    for (DataSnapshot child : snapshot.getChildren()) {
                        users.add(child.getKey());
                    }
                    sink.success(users);
                }

                @Override
                public void onCancelled(DatabaseError error) {
                    log.error("Firebase fetch cancelled", error.toException());
                    sink.error(error.toException());
                }
            });
        });
    }

    public Mono<Void> saveData(MeterDocument document) {
        return Mono.create(sink -> {
            if (document.getMeterId() == null || document.getTimestamp() == null) {
                sink.error(new IllegalArgumentException("MeterId or Timestamp missing"));
                return;
            }

            String timestampStr = TIMESTAMP_FORMATTER.format(document.getTimestamp());
            DatabaseReference ref = database.getReference("SmartMeter/users")
                    .child(document.getMeterId())
                    .child("data")
                    .child(timestampStr);

            // Create map to save
            Map<String, String> data = Map.of(
                    "kWh", String.format("%.2f", document.getKWh()),
                    "Power", "0.00", // placeholder as only kWh is in MeterDocument
                    "Irms", "0.00",
                    "Vrms", "230.00"
            );

            ref.setValue(data, (databaseError, databaseReference) -> {
                if (databaseError != null) {
                    sink.error(databaseError.toException());
                } else {
                    sink.success();
                }
            });
        });
    }

    public void saveAnomaly(AnomalyDocument anomaly) {
        String timestampStr = TIMESTAMP_FORMATTER.format(anomaly.getTimestamp());
        DatabaseReference ref = database.getReference("SmartMeter/users")
                .child(anomaly.getMeterId())
                .child("anomalies")
                .child(timestampStr);

        ref.setValueAsync(anomaly);
        log.info("Anomaly saved to Firebase for meter {}", anomaly.getMeterId());
    }

    private Double parseDouble(Object val) {
        if (val == null) return 0.0;
        try {
            return Double.parseDouble(val.toString());
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }
}
