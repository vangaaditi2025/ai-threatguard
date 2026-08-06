"""add email scan reports table

Revision ID: 0005_email_scan_reports
Revises: 0004_url_scan_reports
Create Date: 2026-08-06 18:19:32.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0005_email_scan_reports'
down_revision = '0004_url_scan_reports'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'email_scan_reports',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email_sha256', sa.String(length=64), nullable=False, unique=True),
        sa.Column('subject', sa.String(length=1024), nullable=True),
        sa.Column('from_address', sa.String(length=512), nullable=True),
        sa.Column('to_address', sa.String(length=1024), nullable=True),
        sa.Column('classification', sa.String(length=50), nullable=False),
        sa.Column('risk_score', sa.Integer(), nullable=False),
        sa.Column('report_data', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('email_scan_reports')
