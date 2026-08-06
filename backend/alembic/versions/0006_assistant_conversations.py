"""add assistant conversation history table

Revision ID: 0006_assistant_conversations
Revises: 0005_email_scan_reports
Create Date: 2026-08-06 18:35:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0006_assistant_conversations'
down_revision = '0005_email_scan_reports'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'assistant_conversations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_message', sa.String(length=4096), nullable=False),
        sa.Column('assistant_response', sa.String(length=8192), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('assistant_conversations')
