# Generated manually for pending email-change confirm-before-switch.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0004_alter_user_managers"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="pending_email",
            field=models.EmailField(blank=True, default=None, null=True, max_length=254),
        ),
    ]
