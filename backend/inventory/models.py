from django.conf import settings
from django.db import connection, models


class InventoryItemQuerySet(models.QuerySet):
    def safe(self):
        return self.only("id", "item", "quantity", "location", "added_by_id", "created_at")


class InventoryItemManager(models.Manager.from_queryset(InventoryItemQuerySet)):
    def get_queryset(self):
        return super().get_queryset().safe()


class InventoryItem(models.Model):
    garden = models.ForeignKey(
        "plots.Garden",
        on_delete=models.CASCADE,
        related_name="inventory_items",
    )

    item = models.CharField(max_length=100)

    quantity = models.CharField(max_length=100)

    location = models.CharField(max_length=100)

    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="inventory_items_added",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    objects = InventoryItemManager()

    def save(self, *args, **kwargs):
        if self._db_has_column("garden_id"):
            super().save(*args, **kwargs)
            return

        with connection.cursor() as cursor:
            columns = connection.introspection.get_table_description(cursor, self._meta.db_table)
            available_columns = {column.name for column in columns}

            field_names = []
            values = []
            update_fields = []

            for field in self._meta.concrete_fields:
                if field.name == "id" or field.name == "garden":
                    continue

                column_name = field.get_attname_column()[1]
                if column_name not in available_columns:
                    continue

                if field.name == "created_at" and getattr(field, "auto_now_add", False):
                    from django.utils import timezone

                    if getattr(self, field.attname, None) is None:
                        setattr(self, field.attname, timezone.now())

                    field_names.append(column_name)
                    values.append(getattr(self, field.attname))
                    continue

                field_names.append(column_name)
                value = getattr(self, field.attname)
                values.append(value)
                update_fields.append(column_name)

            if not field_names:
                super().save(*args, **kwargs)
                return

            if self.pk and not self._state.adding:
                assignments = ", ".join([f'"{column}" = %s' for column in field_names])
                cursor.execute(
                    f'UPDATE "{self._meta.db_table}" SET {assignments} WHERE id = %s',
                    values + [self.pk],
                )
                return

            placeholders = ", ".join(["%s"] * len(field_names))
            quoted_columns = ", ".join([f'"{column}"' for column in field_names])
            cursor.execute(
                f'INSERT INTO "{self._meta.db_table}" ({quoted_columns}) VALUES ({placeholders})',
                values,
            )
            try:
                lastrowid = cursor.lastrowid
            except AttributeError:
                lastrowid = None

            if lastrowid is None:
                try:
                    inserted_id = cursor.fetchone()
                except Exception:
                    inserted_id = None
                if inserted_id:
                    self.pk = inserted_id[0] if isinstance(inserted_id, tuple) else inserted_id
                else:
                    self.pk = None
            else:
                self.pk = lastrowid
            self._state.adding = False

    def _db_has_column(self, column_name):
        try:
            with connection.cursor() as cursor:
                columns = connection.introspection.get_table_description(cursor, self._meta.db_table)
        except Exception:
            return False

        return any(column.name == column_name for column in columns)

    def __str__(self):
        return self.item